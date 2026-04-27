import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ARTICLES, getArticle } from "@/lib/articles";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return {
    title: `${article.title} — NormaAI`,
    description: article.tldr,
    openGraph: {
      title: article.title,
      description: article.tldr,
      type: "article",
      publishedTime: article.datePublished,
      modifiedTime: article.dateModified,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: article.title,
        description: article.tldr,
        datePublished: article.datePublished,
        dateModified: article.dateModified,
        author: { "@type": "Organization", name: "NormaAI", url: "https://normaai.it" },
        publisher: {
          "@type": "Organization",
          name: "NormaAI",
          url: "https://normaai.it",
          logo: { "@type": "ImageObject", url: "https://normaai.it/logo.png" },
        },
        image: `https://images.unsplash.com/photo-${article.image.id}?w=1200&auto=format`,
        mainEntityOfPage: { "@type": "WebPage", "@id": `https://normaai.it/guide/${article.slug}` },
      },
      {
        "@type": "FAQPage",
        mainEntity: article.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "NormaAI", item: "https://normaai.it" },
          { "@type": "ListItem", position: 2, name: "Guide gratuite", item: "https://normaai.it/guide" },
          { "@type": "ListItem", position: 3, name: article.title, item: `https://normaai.it/guide/${article.slug}` },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="min-h-screen bg-[#FAFAF8] text-[#1a1a1a]">
        <div className="max-w-[720px] mx-auto px-6 py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[11.5px] text-[#444] mb-8">
            <Link href="/" className="hover:text-[#1a1a1a] transition-colors">NormaAI</Link>
            <span>/</span>
            <Link href="/guide" className="hover:text-[#1a1a1a] transition-colors">Guide</Link>
            <span>/</span>
            <span className="text-[#666] truncate max-w-[200px]">{article.categoryLabel}</span>
          </nav>

          {/* Category label */}
          <div className="text-[11px] uppercase tracking-[1.2px] text-accent mb-3 font-medium">
            {article.categoryLabel}
          </div>

          {/* Title */}
          <h1 className="font-serif text-[30px] sm:text-[36px] tracking-[-0.8px] leading-[1.2] mb-4">
            {article.title}
          </h1>

          {/* TL;DR box — for AI citations (featured snippet bait) */}
          <div className="bg-white border border-[#222] rounded-xl p-4 mb-6">
            <div className="text-[10.5px] uppercase tracking-[1px] text-accent mb-2 font-medium">Risposta rapida</div>
            <p className="text-[13.5px] text-[#1a1a1a] leading-[1.65]">{article.tldr}</p>
          </div>

          {/* Image */}
          <div className="relative w-full h-[220px] sm:h-[280px] rounded-xl overflow-hidden mb-8 bg-white">
            <Image
              src={`https://images.unsplash.com/photo-${article.image.id}?w=1200&auto=format&fit=crop`}
              alt={article.image.alt}
              fill
              className="object-cover opacity-80"
              sizes="(max-width: 768px) 100vw, 720px"
              priority
            />
          </div>

          {/* Intro */}
          <p className="text-[14.5px] text-[#bbb] leading-[1.75] mb-8">
            {article.intro}
          </p>

          {/* Sections */}
          <div className="space-y-7">
            {article.sections.map((sec) => (
              <section key={sec.heading}>
                <h2 className="font-serif text-[20px] tracking-[-0.3px] mb-3">{sec.heading}</h2>
                <div className="text-[13.5px] text-[#bbb] leading-[1.75] whitespace-pre-line">
                  <MarkdownBody text={sec.body} />
                </div>
              </section>
            ))}
          </div>

          {/* Legal references */}
          <div className="mt-8 py-4 border-t border-[#E5E1D8]">
            <span className="text-[11px] uppercase tracking-[1px] text-[#444] mr-2">Fonti normative:</span>
            <span className="text-[12px] text-[#555]">{article.legge}</span>
          </div>

          {/* FAQ */}
          {article.faqs.length > 0 && (
            <div className="mt-8">
              <h2 className="font-serif text-[22px] tracking-[-0.3px] mb-5">Domande frequenti</h2>
              <div className="space-y-4">
                {article.faqs.map((faq) => (
                  <div key={faq.q} className="border border-[#E5E1D8] rounded-xl p-4 bg-white">
                    <h3 className="text-[13.5px] font-medium text-[#1a1a1a] mb-2">{faq.q}</h3>
                    <p className="text-[13px] text-[#888] leading-[1.65]">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-10 p-5 bg-white border border-[#E5E1D8] rounded-2xl text-center">
            <p className="text-[13px] text-[#888] mb-1">Hai un caso specifico?</p>
            <p className="text-[14px] text-[#1a1a1a] mb-4 font-medium">
              Fai la tua domanda a NormaAI — risposta immediata con le fonti di legge.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-[10px] bg-accent text-white rounded-lg text-[13px] font-medium hover:bg-accent-hover transition-colors"
            >
              Chiedi a NormaAI →
            </Link>
          </div>

          {/* Back link */}
          <div className="mt-8 text-center">
            <Link href="/guide" className="text-[12px] text-[#444] hover:text-[#1a1a1a] transition-colors">
              ← Tutte le guide
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

// Minimal inline markdown renderer (bold + newlines — avoids react-markdown dependency)
function MarkdownBody({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={i}>
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={j} className="text-[#1a1a1a] font-medium">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                part
              )
            )}
            {i < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}
