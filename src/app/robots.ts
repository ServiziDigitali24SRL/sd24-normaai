import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/utente/", "/avvocato/", "/onboarding"],
      },
    ],
    sitemap: "https://normaai.it/sitemap.xml",
  };
}
