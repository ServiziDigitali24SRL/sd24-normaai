import type { MetadataRoute } from "next";

const baseUrl = "https://normaai.it";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/avvocati`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/api`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/whitelabel`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/termini`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/cookie`, lastModified: now, changeFrequency: "monthly", priority: 0.2 },
  ];
}
