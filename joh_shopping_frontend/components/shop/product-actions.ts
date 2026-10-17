"use client";

import { toast } from "sonner";
import type { Product, ProductVariant } from "@/types";
import { useCart, useCompare, useUI, useWishlist } from "@/stores";
import { useT } from "@/lib/i18n/client";

/** Shared add-to-cart / wishlist / compare behaviour with toasts. */
export function useProductActions() {
  const { t } = useT();
  const add = useCart((s) => s.add);
  const toggleWish = useWishlist((s) => s.toggle);
  const toggleCompare = useCompare((s) => s.toggle);
  const compareIds = useCompare((s) => s.ids);
  const setCartOpen = useUI((s) => s.setCartOpen);

  return {
    addToCart(product: Product, variant?: ProductVariant, qty = 1, openDrawer = true) {
      const v = variant ?? product.variants.find((x) => x.stock > 0) ?? product.variants[0]!;
      add({ productId: product.id, variantId: v.id, qty });
      if (openDrawer) setCartOpen(true);
      else toast.success(t.common.actions.addedToCart, { description: product.name });
    },
    toggleWishlist(product: Product) {
      const added = toggleWish(product.id);
      toast(added ? t.common.product.addedToWishlist : t.common.product.removedFromWishlist, { description: product.name });
    },
    toggleCompare(product: Product) {
      const had = compareIds.includes(product.id);
      const ok = toggleCompare(product.id);
      if (!ok && !had) toast.error(t.common.product.compareLimit);
      else if (ok) toast.success(t.common.product.addedToCompare, { description: product.name });
    },
  };
}
