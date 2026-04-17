import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { sendWelcomeSMS } from '@/lib/twilio';
import { sendWelcomeEmail } from '@/lib/email';

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
