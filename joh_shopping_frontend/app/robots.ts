import type { MetadataRoute } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** robots.txt: keep the back office, accounts and checkout out of search results. */
export default function robots(): MetadataRoute.Robots {
  const privatePaths = ["admin", "account", "checkout", "cart", "compare", "login", "register", "forgot-password", "reset-password", "verify-email"].flatMap((p) => [`/sw/${p}`, `/en/${p}`]);
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...privatePaths, "/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
