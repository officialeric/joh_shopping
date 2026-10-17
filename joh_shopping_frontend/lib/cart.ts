import type { CartLine, Coupon, DeliveryMethod, FlashSale, Product, ProductVariant, ShippingZone } from "@/types";
import type { Shop } from "@/lib/data/catalog";
import { getVariant } from "@/lib/data/catalog";

/**
 * Instant cart pricing for the UI. Mirrors the API's CartPricer (live
 * flash-sale prices, coupon, zone shipping); checkout re-prices on the server,
 * which is the source of truth.
 */

export const FREE_SHIPPING_DAR = 300_000;
const FALLBACK_SHIPPING_FEE = 18_000;

export interface PricedLine {
  line: CartLine;
  product: Product;
  variant: ProductVariant;
  unitPrice: number;
  lineTotal: number;
}

export type CouponError = "invalid" | "min_spend";

export interface CartSummary {
  items: PricedLine[];
  count: number;
  subtotal: number;
  discount: number;
  shipping: number | null; // null = not yet known
  freeShipping: boolean;
  total: number;
  coupon: Coupon | null;
  couponError: CouponError | null;
  freeShippingRemaining: number;
}

type PricingData = Pick<Shop, "getProduct" | "zones" | "flashSale">;

export function zoneForRegion(zones: ShippingZone[], region: string | undefined): ShippingZone | undefined {
  return region ? zones.find((z) => z.active && z.regions.includes(region)) : undefined;
}

export function shippingFee(zones: ShippingZone[], region: string | undefined, method: DeliveryMethod, subtotal: number): number | null {
  if (method === "pickup") return 0;
  if (!region) return null;
  const zone = zoneForRegion(zones, region);
  if (!zone) return FALLBACK_SHIPPING_FEE;
  if (method === "express" && zone.expressFee > 0) return zone.expressFee;
  return subtotal >= zone.freeAbove ? 0 : zone.standardFee;
}

export function expressAvailable(zones: ShippingZone[], region: string | undefined) {
  return (zoneForRegion(zones, region)?.expressFee ?? 0) > 0;
}

/**
 * The sale price for a product while its flash sale is live and stock remains.
 * `now` comes from useNow() (null while prerendering, so no sale price then).
 */
export function flashSalePrice(sale: FlashSale | null, product: Product, now: number | null | undefined): number | undefined {
  if (now == null || !sale?.active || new Date(sale.startsAt).getTime() > now || new Date(sale.endsAt).getTime() <= now) return undefined;
  const item = sale.items.find((i) => i.productId === product.id);
  return item && item.sold < item.quantity ? item.salePrice : undefined;
}

/** A variant's price after any live flash sale (the sale discount applies to every variant). */
export function unitPrice(sale: FlashSale | null, product: Product, variant: ProductVariant, now: number | null | undefined) {
  const salePrice = flashSalePrice(sale, product, now);
  return salePrice == null ? variant.price : Math.max(0, variant.price - Math.max(0, product.price - salePrice));
}

export function priceCart(
  shop: PricingData,
  lines: CartLine[],
  coupon: Coupon | null,
  opts: { region?: string; delivery?: DeliveryMethod; now?: number | null } = {},
): CartSummary {
  const items: PricedLine[] = [];
  for (const line of lines) {
    const product = shop.getProduct(line.productId);
    const variant = product && getVariant(product, line.variantId);
    if (!product || !variant) continue;
    const price = unitPrice(shop.flashSale, product, variant, opts.now);
    items.push({ line, product, variant, unitPrice: price, lineTotal: price * line.qty });
  }
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const count = items.reduce((s, i) => s + i.line.qty, 0);

  let couponError: CouponError | null = null;
  let discount = 0;
  if (coupon) {
    if (subtotal < coupon.minSpend) couponError = "min_spend";
    else {
      if (coupon.type === "percent") discount = Math.round((subtotal * coupon.value) / 100);
      if (coupon.type === "fixed") discount = coupon.value;
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
      discount = Math.min(discount, subtotal);
    }
  }

  const freeShipping = !!coupon && !couponError && coupon.type === "free_shipping";
  const baseShipping = shippingFee(shop.zones, opts.region, opts.delivery ?? "standard", subtotal - discount);
  const shipping = freeShipping && baseShipping != null ? 0 : baseShipping;

  return {
    items,
    count,
    subtotal,
    discount,
    shipping,
    freeShipping,
    total: Math.max(0, subtotal - discount + (shipping ?? 0)),
    coupon,
    couponError,
    freeShippingRemaining: Math.max(0, FREE_SHIPPING_DAR - (subtotal - discount)),
  };
}
