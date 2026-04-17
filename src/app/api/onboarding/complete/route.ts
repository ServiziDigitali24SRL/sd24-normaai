import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { sendWelcomeSMS } from '@/lib/twilio';
import { sendWelcomeEmail } from '@/lib/email';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, name, phone, role, ...profileData } = body;

    // Verifica autenticazione
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Aggiorna profilo Supabase
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: name,
        phone,
        role,
        // Professionista
        ordine_professionale: profileData.ordine_professionale || null,
        numero_iscrizione: profileData.numero_iscrizione || null,
        foro_competenza: profileData.foro_competenza || null,
        piva: profileData.piva || null,
        // Impresa
        company_name: profileData.ragione_sociale || null,
        dimensione_azienda: profileData.dimensione_azienda || null,
        settore_azienda: profileData.settore_azienda || null,
        pec: profileData.pec || null,
        // Preferenze
        aree_interesse: profileData.aree_interesse || { predefinite: [], personalizzate: [] },
        obiettivo_principale: profileData.obiettivo_principale || null,
        // Onboarding completato
        onboarding_completed: true,
        onboarding_step: 4,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[onboarding/complete] DB error:', updateError);
      return NextResponse.json({ error: 'Errore salvataggio profilo' }, { status: 500 });
    }

    // B-01 fix: sync user_metadata via admin API
    // Dashboard + chat + middleware leggono role da user_metadata — deve combaciare con profiles
    try {
      const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceUrl && serviceKey) {
        const admin = createServiceClient(serviceUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        await admin.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...user.user_metadata,
            role,
            full_name: name,
            ragione_sociale: profileData.ragione_sociale || null,
            onboarding_completed: true,
          },
        });
      } else {
        console.warn('[onboarding/complete] SERVICE_ROLE_KEY missing — user_metadata non sync');
      }
    } catch (metaErr) {
      console.error('[onboarding/complete] user_metadata sync error:', metaErr);
      Sentry.captureException?.(metaErr);
    }

    // B-05/H-05 fix: inizializza company_profiles per impresa (trigger onboarding dedicato)
    if (role === 'impresa') {
      try {
        const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (serviceUrl && serviceKey) {
          const admin = createServiceClient(serviceUrl, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const trialEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          await admin.from('company_profiles').upsert({
            user_id: userId,
            piano: 'impresa_micro',
            stato: 'trial',
            query_incluse: 543,
            query_usate_mese: 0,
            mese_corrente: new Date().toISOString().slice(0, 7),
            trial_ends_at: trialEnds,
          }, { onConflict: 'user_id' });
        }
      } catch (cpErr) {
        console.error('[onboarding/complete] company_profiles init error:', cpErr);
      }
    }

    // Crea Stripe Customer (best-effort, non blocca il flusso)
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const customer = await stripe.customers.create({
        email,
        name,
        phone: phone || undefined,
        metadata: { user_id: userId, role, onboarding_completed: 'true' },
      });
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', userId);
    } catch (stripeErr) {
      console.error('[onboarding/complete] Stripe error (non-blocking):', stripeErr);
    }

    // Email benvenuto (best-effort)
    if (email && name) {
      sendWelcomeEmail(email, name, role).catch((err) =>
        console.error('[onboarding/complete] Email error:', err)
      );
    }

    // SMS benvenuto (best-effort, solo se telefono fornito)
    if (phone && name && role) {
      sendWelcomeSMS({ phone, name, role }).catch((err) =>
        console.error('[onboarding/complete] SMS error:', err)
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[onboarding/complete] Unexpected error:', err);
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}
