import type { Metadata } from "next";
import Link from "next/link";
import { ARTICLES, ALL_CATEGORIES } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Guide gratuite — NormaAI",
  description: "Guide pratiche sulla normativa italiana: diritti del lavoro, condominio, contratti, fisco e molto altro.",
};

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1a1a1a]">
      <div className="max-w-[820px] mx-auto px-6 py-12">
        <Link href="/" className="text-[12px] text-[#555] hover:text-[#1a1a1a] transition-colors mb-8 inline-block">
          ← Torna a NormaAI
        </Link>

        <h1 className="font-serif text-[36px] tracking-[-1px] mb-2">Guide gratuite</h1>
        <p className="text-[13.5px] text-[#555] mb-2 leading-[1.6]">
          Risposte chiare ai problemi legali più comuni. Scritte da NormaAI, verificate sulla legislazione italiana aggiornata.
        </p>
        <p className="text-[12px] text-[#444] mb-10">
          {ARTICLES.length} guide • aggiornate continuamente
        </p>

        <div className="grid gap-10">
          {ALL_CATEGORIES.map(([cat, label]) => {
            const items = ARTICLES.filter((a) => a.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <h2 className="text-[11px] uppercase tracking-[1px] text-[#555] mb-3 pb-2 border-b border-[#E5E1D8]">
                  {label} <span className="text-[#333] ml-1">({items.length})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/guide/${article.slug}`}
                      className="flex items-start gap-3 p-3 rounded-xl border border-[#E5E1D8] bg-white hover:border-[#D5D0C8] hover:bg-white transition-all group"
                    >
                      <span className="text-accent mt-[2px] shrink-0 text-[13px]">→</span>
                      <span className="text-[13px] text-[#999] group-hover:text-[#1a1a1a] transition-colors leading-[1.5]">
                        {article.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 p-5 bg-white border border-[#E5E1D8] rounded-2xl text-center">
          <p className="text-[13px] text-[#666] mb-3">
            Non trovi la guida che cerchi? Fai la domanda direttamente a NormaAI.
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-[9px] bg-accent text-white rounded-lg text-[13px] font-medium hover:bg-accent-hover transition-colors"
          >
            Fai una domanda →
          </Link>
        </div>
      </div>
    </div>
  );
}
