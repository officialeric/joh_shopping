"use client";

import { Heart, Share2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Link } from "@/components/ui/link";
import { AccountHeader } from "@/components/account/account-shell";
import { ProductCard } from "@/components/shop/product-card";
import { useShop } from "@/lib/data/shop-context";
import { useT } from "@/lib/i18n/client";
import { useCart, useUI, useWishlist } from "@/stores";

export default function WishlistPage() {
  const { getProduct } = useShop();
  const { t } = useT();
  const w = t.account.wishlist;
  const ids = useWishlist((s) => s.ids);
  const add = useCart((s) => s.add);
  const setCartOpen = useUI((s) => s.setCartOpen);
  const products = ids.map((id) => getProduct(id)).filter((p): p is Product => !!p);

  return (
    <>
      <AccountHeader
        title={w.title}
        subtitle={w.subtitle}
        action={
          products.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  const url = `${window.location.origin}/${window.location.pathname.split("/")[1]}/products?q=${encodeURIComponent(products.map((p) => p.name).join(" "))}`;
                  await navigator.clipboard.writeText(url);
                  toast.success(t.common.actions.copied);
                }}
              >
                <Share2 />
                {w.share}
              </Button>
              <Button
                onClick={() => {
                  products.forEach((p) => {
                    const v = p.variants.find((x) => x.stock > 0);
                    if (v) add({ productId: p.id, variantId: v.id, qty: 1 });
                  });
                  toast.success(w.movedAll);
                  setCartOpen(true);
                }}
              >
                <ShoppingBag />
                {w.moveAllToCart}
              </Button>
            </div>
          )
        }
      />
      {products.length === 0 ? (
        <EmptyState
          icon={<Heart />}
          title={w.empty}
          description={w.emptyDesc}
          action={
            <Button asChild>
              <Link href="/products">{t.common.cart.startShopping}</Link>
            </Button>
          }
          className="rounded-[24px] border border-dashed border-border"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="relative">
              {p.compareAtPrice && p.compareAtPrice > p.price && (
                <span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-success px-2.5 py-0.5 text-[11px] font-semibold text-white shadow">
                  {w.priceDrop}
                </span>
              )}
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
