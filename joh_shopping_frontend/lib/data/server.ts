import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { CmsPage, Coupon, ShopData } from "@/types";
import { createShop } from "./catalog";

/**
 * Storefront data for server components, fetched from the Laravel API and
 * cached with Cache Components. Entries refresh every minute, and at once when
 * the API pings /api/revalidate after an admin edit (tag "catalog").
 *
 * The API must be reachable during `next build`.
 */

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

async function fetchJson<T>(path: string): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { headers: { Accept: "application/json" } });
  } catch (error) {
    throw new Error(`Could not reach the Joh Shopping API at ${API_URL} (${(error as Error).message}). Start the backend with \`php artisan dev\`.`);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Joh Shopping API returned ${res.status} for ${path}.`);
  return ((await res.json()) as { data: T }).data;
}

export async function getShopData(): Promise<ShopData> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const data = await fetchJson<ShopData>("/bootstrap");
  if (!data) throw new Error("Joh Shopping API: /bootstrap not found.");
  return data;
}

/** Catalog helpers for server components (see createShop). */
export async function getShop() {
  return createShop(await getShopData());
}

/** A published CMS page (policies), or null. */
export async function getPage(slug: string): Promise<CmsPage | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  return fetchJson<CmsPage>(`/pages/${encodeURIComponent(slug)}`);
}

/** Coupons currently open to everyone (deals page). */
export async function getPublicCoupons(): Promise<Coupon[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  return (await fetchJson<{ coupons: Coupon[] }>("/deals"))?.coupons ?? [];
}
