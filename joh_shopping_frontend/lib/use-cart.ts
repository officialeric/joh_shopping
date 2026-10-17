"use client";

import { useMemo } from "react";
import type { DeliveryMethod } from "@/types";
import { priceCart } from "@/lib/cart";
import { useShop } from "@/lib/data/shop-context";
import { useNow } from "@/lib/hooks";
import { useCart } from "@/stores";

/** The cart priced with live shop data (re-priced once a minute for flash-sale windows). */
export function useCartSummary(opts: { region?: string; delivery?: DeliveryMethod } = {}) {
  const shop = useShop();
  const lines = useCart((s) => s.lines);
  const coupon = useCart((s) => s.coupon);
  const now = useNow();
  const minute = now == null ? null : Math.floor(now / 60_000) * 60_000;
  const { region, delivery } = opts;
  return useMemo(() => priceCart(shop, lines, coupon, { region, delivery, now: minute }), [shop, lines, coupon, region, delivery, minute]);
}
