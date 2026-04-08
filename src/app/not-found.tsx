import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#FAFAF8] text-[#F0EEE8] px-6">
      <h1 className="text-[72px] font-serif font-bold tracking-tight">
        4<span className="text-[#e8340a]">0</span>4
      </h1>
      <p className="text-[16px] text-[#888] mt-2 mb-8 text-center max-w-md">
        Pagina non trovata. La norma che cerchi potrebbe essere altrove.
      </p>
      <Link
        href="/"
        className="bg-[#e8340a] text-white px-6 py-3 rounded-lg text-[14px] font-semibold hover:bg-[#c42c08] transition-colors"
      >
        Torna alla home
      </Link>
    </div>
  );
}
