import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://normaai.eu";
  const now = new Date();

  return [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/guide`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/demo-chat`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/termini`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
}
