'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { StepRole } from './steps/StepRole';
import { StepPersonalData } from './steps/StepPersonalData';
import { StepPreferences } from './steps/StepPreferences';
import { StepCompletion } from './steps/StepCompletion';

interface OnboardingData {
  role: 'cittadino' | 'professionista' | 'impresa' | null;
  name: string;
  phone: string;
  piva?: string;
  ordine_professionale?: string;
  numero_iscrizione?: string;
  foro_competenza?: string;
  ragione_sociale?: string;
  dimensione_azienda?: string;
  settore_azienda?: string;
  pec?: string;
  aree_interesse: { predefinite: string[]; personalizzate: string[] };
  obiettivo_principale: string;
}

const TOTAL_STEPS = 4;

const STEP_LABELS = ['Profilo', 'Dati', 'Preferenze', 'Conferma'];

export default function OnboardingWizard() {
  const router = useRouter();
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');

  const [data, setData] = useState<OnboardingData>({
    role: null,
    name: '',
    phone: '',
    aree_interesse: { predefinite: [], personalizzate: [] },
    obiettivo_principale: '',
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/'); return; }
      setUserId(user.id);
      setUserEmail(user.email ?? '');
      // Pre-popola nome da user_metadata
      if (user.user_metadata?.full_name) {
        setData((p) => ({ ...p, name: user.user_metadata.full_name }));
      }
      // Carica step salvato
      supabase.from('profiles').select('onboarding_step').eq('id', user.id).single()
        .then(({ data: profile }) => {
          if (profile?.onboarding_step && profile.onboarding_step > 0) {
            setCurrentStep(Math.min(profile.onboarding_step, TOTAL_STEPS));
          }
        });
    });
  }, []);

  const updateData = (partial: Partial<OnboardingData>) => {
    setData((p) => ({ ...p, ...partial }));
  };

  const saveStep = async (step: number) => {
    if (!userId) return;
    await supabase.from('profiles').update({ onboarding_step: step }).eq('id', userId);
  };

  const goNext = async () => {
    const next = currentStep + 1;
    await saveStep(next);
    setCurrentStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goPrev = () => {
    setCurrentStep((p) => Math.max(1, p - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleComplete = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: userEmail, ...data }),
      });
      if (res.ok) {
        router.replace(data.role === 'impresa' ? '/dashboard-impresa' : '/dashboard');
      } else {
        console.error('Onboarding complete error:', await res.text());
      }
    } catch (err) {
      console.error('Onboarding complete exception:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-start py-8 px-4">
      {/* Header */}
      <div className="w-full max-w-[480px] mb-8">
        <div className="font-serif text-[22px] tracking-[-0.5px] text-[#1a1a1a] text-center mb-6">
          Norma<span className="text-accent">AI</span>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
              i + 1 <= currentStep ? 'bg-accent' : 'bg-[#E5E1D8]'
            }`} />
          ))}
        </div>
        <div className="flex justify-between">
          {STEP_LABELS.map((label, i) => (
            <span key={label} className={`text-[10px] ${i + 1 <= currentStep ? 'text-accent' : 'text-[#9A9690]'}`}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-[480px] bg-white border border-[#E5E1D8] rounded-2xl p-6 shadow-sm">
        {currentStep === 1 && (
          <StepRole data={data} updateData={updateData} onNext={goNext} />
        )}
        {currentStep === 2 && (
          <StepPersonalData data={data} updateData={updateData} onNext={goNext} onPrev={goPrev} />
        )}
        {currentStep === 3 && (
          <StepPreferences data={data} updateData={updateData} onNext={goNext} onPrev={goPrev} />
        )}
        {currentStep === 4 && (
          <StepCompletion data={data} onComplete={handleComplete} onPrev={goPrev} isLoading={isLoading} />
        )}
      </div>

      <p className="mt-6 text-[11px] text-[#9A9690] text-center">
        Step {currentStep} di {TOTAL_STEPS} · Puoi completare il profilo in qualsiasi momento
      </p>
    </div>
  );
}
