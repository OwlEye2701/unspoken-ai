import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://unspokenai.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/auth/login", "/auth/register", "/privacy", "/terms", "/support"],
        disallow: ["/app/", "/api/", "/auth/update-password", "/auth/forgot-password"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
