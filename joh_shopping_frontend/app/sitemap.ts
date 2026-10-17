import type { MetadataRoute } from "next";
import { getShopData } from "@/lib/data/server";
import { locales } from "@/lib/i18n/config";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** sitemap.xml: storefront pages and every published product, in Swahili and English. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, pages, categories } = await getShopData();
  const paths = [
    "",
    "/products",
    "/deals",
    "/brands",
    "/about",
    "/contact",
    "/faq",
    ...categories.map((c) => `/products?category=${c.slug}`),
    ...pages.map((p) => `/policies/${p.slug}`),
    ...products.map((p) => `/products/${p.slug}`),
  ];
  return paths.map((path) => ({
    url: `${SITE_URL}/sw${path}`,
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${path}`])) },
  }));
}
