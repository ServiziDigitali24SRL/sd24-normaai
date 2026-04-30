"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    // Supabase passes the token in the URL hash after redirect
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        // User is now in password recovery mode — form is ready
      }
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleReset() {
    if (!password.trim()) { setError("Inserisci una nuova password."); return; }
    if (password.length < 8) { setError("La password deve essere di almeno 8 caratteri."); return; }
    if (password !== confirm) { setError("Le password non coincidono."); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError("Errore durante il reset. Richiedi un nuovo link.");
    else setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="text-green-700 text-[14px] mb-4">Password aggiornata con successo!</div>
        <button
          onClick={() => router.push("/")}
          className="text-accent text-[13px] hover:underline"
        >
          Torna alla home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-[12px] text-[#666] block mb-1">Nuova password</label>
        <input
          type="password"
          placeholder="Almeno 8 caratteri"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-[#ddd] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="text-[12px] text-[#666] block mb-1">Conferma password</label>
        <input
          type="password"
          placeholder="Ripeti la password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full border border-[#ddd] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent"
        />
      </div>
      {error && <div className="text-[12px] text-red-600">{error}</div>}
      <button
        onClick={handleReset}
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-accent text-white text-[14px] font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
      >
        {loading ? "Aggiornamento..." : "Aggiorna password"}
      </button>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E1D8] p-8 w-full max-w-md">
        <div className="font-serif text-[24px] text-[#1a1a1a] mb-1">
          Norma<span className="text-accent">AI</span>
        </div>
        <h1 className="text-[18px] font-semibold text-[#1a1a1a] mb-1">Reimposta la password</h1>
        <p className="text-[13px] text-[#666] mb-6">Scegli una nuova password per il tuo account.</p>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
