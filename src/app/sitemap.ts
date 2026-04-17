import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/articles";

const baseUrl = "https://normaai.it";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/guide`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/termini`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/cookie`, lastModified: now, changeFrequency: "monthly", priority: 0.2 },
  ];

  // Articoli reali (route /guide/[slug] single-level) — no URL 404 inventate
  const articlePages: MetadataRoute.Sitemap = ARTICLES.map((a) => ({
    url: `${baseUrl}/guide/${a.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...articlePages];
}
