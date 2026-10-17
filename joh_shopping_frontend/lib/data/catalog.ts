import type { Locale } from "@/lib/i18n/config";
import type { Product, ProductVariant, ShopData } from "@/types";

/**
 * Catalog helpers over the storefront data from the API (GET /api/bootstrap).
 * Server components get it from `getShop()` (lib/data/server.ts), client
 * components from `useShop()` (lib/data/shop-context.tsx). Both return the
 * object built by `createShop()`.
 */

export function getVariant(product: Product, variantId: string): ProductVariant | undefined {
  return product.variants.find((v) => v.id === variantId);
}

export function variantLabel(product: Product, variant: ProductVariant, locale: Locale) {
  const color = product.colors.find((c) => c.hex.toLowerCase() === variant.color.toLowerCase())?.name[locale];
  return [color, variant.storage, variant.ram && product.rams.length ? `${variant.ram} RAM` : null].filter(Boolean).join(" · ");
}

export const totalStock = (p: Product) => p.variants.reduce((s, v) => s + v.stock, 0);

export function ratingBreakdown(product: Product) {
  const total = product.reviewCount;
  const five = Math.round(total * (product.rating >= 4.7 ? 0.78 : 0.6));
  const four = Math.round(total * 0.16);
  const three = Math.round(total * 0.04);
  const two = Math.round(total * 0.01);
  const one = Math.max(0, total - five - four - three - two);
  return [five, four, three, two, one];
}

/** "+255712000100" → "+255 712 000 100" */
export function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.length === 12 ? `+${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}` : phone;
}

export interface ProductQuery {
  q?: string;
  category?: string; // slug
  brand?: string[]; // slugs
  condition?: string[];
  storage?: string[];
  ram?: string[];
  color?: string[]; // english colour names, lowercased
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  deals?: boolean;
  sort?: SortKey;
}

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc" | "rating" | "popular";

function parseStorage(s: string) {
  return s.endsWith("TB") ? parseInt(s) * 1024 : parseInt(s);
}

export function createShop(data: ShopData) {
  const { products, categories, brands } = data;
  const byId = new Map(products.map((p) => [p.id, p]));
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const getProduct = (id: string) => byId.get(id);
  const getBrand = (id: string) => brands.find((b) => b.id === id);
  const getCategory = (id: string) => categories.find((c) => c.id === id);
  const getCategoryBySlug = (slug: string) => categories.find((c) => c.slug === slug);

  function queryProducts(query: ProductQuery): Product[] {
    let list = products;
    if (query.q) {
      const q = query.q.toLowerCase();
      list = list.filter((p) => {
        const brand = getBrand(p.brandId)?.name.toLowerCase() ?? "";
        return p.name.toLowerCase().includes(q) || brand.includes(q) || p.shortDescription.en.toLowerCase().includes(q) || p.shortDescription.sw.toLowerCase().includes(q);
      });
    }
    if (query.category) {
      const cat = getCategoryBySlug(query.category);
      if (cat) list = list.filter((p) => p.categoryId === cat.id);
    }
    if (query.brand?.length) {
      const ids = brands.filter((b) => query.brand!.includes(b.slug)).map((b) => b.id);
      list = list.filter((p) => ids.includes(p.brandId));
    }
    if (query.condition?.length) list = list.filter((p) => query.condition!.includes(p.condition));
    if (query.storage?.length) list = list.filter((p) => p.storages.some((s) => query.storage!.includes(s)));
    if (query.ram?.length) list = list.filter((p) => p.rams.some((r) => query.ram!.includes(r)));
    if (query.color?.length) list = list.filter((p) => p.colors.some((c) => query.color!.includes(c.name.en.toLowerCase())));
    if (query.minPrice != null) list = list.filter((p) => p.price >= query.minPrice!);
    if (query.maxPrice != null) list = list.filter((p) => p.price <= query.maxPrice!);
    if (query.rating) list = list.filter((p) => p.rating >= query.rating!);
    if (query.inStock) list = list.filter((p) => totalStock(p) > 0);
    if (query.deals) list = list.filter((p) => p.compareAtPrice && p.compareAtPrice > p.price);

    const sorted = [...list];
    switch (query.sort) {
      case "newest":
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case "price-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case "popular":
        sorted.sort((a, b) => b.sold - a.sold);
        break;
      default:
        sorted.sort((a, b) => Number(b.tags.includes("featured")) - Number(a.tags.includes("featured")) || b.sold - a.sold);
    }
    return sorted;
  }

  function relatedProducts(product: Product, limit = 4) {
    return products
      .filter((p) => p.id !== product.id && p.categoryId === product.categoryId)
      .sort((a, b) => Number(b.brandId === product.brandId) - Number(a.brandId === product.brandId) || b.sold - a.sold)
      .slice(0, limit);
  }

  /** Accessories that fit a phone, or phones an accessory fits. */
  function compatibleProducts(product: Product, limit = 4) {
    return product.compatibleWith
      .map((id) => byId.get(id))
      .filter((p): p is Product => !!p)
      .slice(0, limit);
  }

  return {
    ...data,

    getProduct,
    getProductBySlug: (slug: string) => bySlug.get(slug),
    getBrand,
    getBrandBySlug: (slug: string) => brands.find((b) => b.slug === slug),
    getCategory,
    getCategoryBySlug,
    getStore: (id: string | undefined) => (id ? data.stores.find((s) => s.id === id) : undefined),

    queryProducts,
    relatedProducts,
    compatibleProducts,

    /** "Frequently bought together": phone + case + charger/audio. */
    boughtTogether(product: Product): Product[] {
      if (product.categoryId !== "c-phones") return relatedProducts(product, 2);
      const compatible = compatibleProducts(product, 6);
      const fallback = [byId.get("a-glass"), byId.get("a-baseus100w")].filter((p): p is Product => !!p);
      return [...compatible, ...fallback].filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i).slice(0, 2);
    },

    byTag: (tag: Product["tags"][number], limit = 8) => products.filter((p) => p.tags.includes(tag)).slice(0, limit),
    newArrivals: (limit = 8) => [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit),
    bestSellers: (limit = 8) => [...products].sort((a, b) => b.sold - a.sold).slice(0, limit),
    deals: (limit = 8) =>
      products
        .filter((p) => p.compareAtPrice && p.compareAtPrice > p.price)
        .sort((a, b) => b.compareAtPrice! - b.price - (a.compareAtPrice! - a.price))
        .slice(0, limit),

    allStorages: Array.from(new Set(products.flatMap((p) => p.storages))).sort((a, b) => parseStorage(a) - parseStorage(b)),
    allRams: Array.from(new Set(products.flatMap((p) => p.rams))).sort((a, b) => parseInt(a) - parseInt(b)),
    allColors: Array.from(new Map(products.flatMap((p) => p.colors).map((c) => [c.name.en.toLowerCase(), c])).values()),

    /** Localised label for an order line; falls back to the stored snapshot. */
    orderItemLabel(item: { productId: string; variantId: string; variantLabel: string }, locale: Locale) {
      const product = byId.get(item.productId);
      const variant = product?.variants.find((v) => v.id === item.variantId);
      return product && variant ? variantLabel(product, variant, locale) : item.variantLabel;
    },

    /** Store contact details from Admin → Settings, formatted for display and links. */
    contact: {
      phone: formatPhone(data.settings.phone),
      phoneHref: `tel:${data.settings.phone.replace(/\s/g, "")}`,
      whatsapp: data.settings.whatsapp.replace(/\D/g, ""),
      email: data.settings.email,
      address: data.settings.address,
    },
  };
}

export type Shop = ReturnType<typeof createShop>;
