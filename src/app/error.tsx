"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0D0D0D] text-[#F0EEE8] px-6">
      <h1 className="text-[48px] font-serif font-bold tracking-tight mb-2">
        Norma<span className="text-[#e8340a]">AI</span>
      </h1>
      <p className="text-[16px] text-[#888] mt-2 mb-2 text-center max-w-md">
        Si è verificato un errore imprevisto.
      </p>
      <p className="text-[12px] text-[#555] mb-8 text-center max-w-md font-mono">
        {error?.message || "Errore sconosciuto"}
      </p>
      <button
        onClick={reset}
        className="bg-[#e8340a] text-white px-6 py-3 rounded-lg text-[14px] font-semibold hover:bg-[#c42c08] transition-colors"
      >
        Riprova
      </button>
    </div>
  );
}
