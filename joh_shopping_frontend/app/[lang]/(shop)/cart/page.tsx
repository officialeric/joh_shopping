"use client";

import { ArrowLeft, Heart, Lock, ShoppingBag } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { PaymentMark, ONLINE_METHODS } from "@/components/brand/payment-logos";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/primitives";
import { CartLineRow, FreeShippingMeter } from "@/components/shop/cart-drawer";
import { CouponBox, SummaryLines } from "@/components/shop/cart-summary";
import { ProductRail } from "@/components/shop/product-rail";
import { useShop } from "@/lib/data/shop-context";
import { useCartSummary } from "@/lib/use-cart";
import { useT } from "@/lib/i18n/client";
import { fmt } from "@/lib/utils";
import { useCart, useHydrated, useWishlist } from "@/stores";

export default function CartPage() {
  const { t } = useT();
  const hydrated = useHydrated();
  const clear = useCart((s) => s.clear);
  const remove = useCart((s) => s.remove);
  const wish = useWishlist();
  const summary = useCartSummary();
  const { bestSellers, compatibleProducts } = useShop();

  const recommendations = useMemo(() => {
    const inCart = new Set(summary.items.map((i) => i.product.id));
    const fromCart = summary.items.flatMap((i) => compatibleProducts(i.product, 6));
    const list = [...fromCart, ...bestSellers(12)].filter((p, i, arr) => !inCart.has(p.id) && arr.findIndex((x) => x.id === p.id) === i);
    return list.slice(0, 8);
  }, [summary.items, bestSellers, compatibleProducts]);

  if (!hydrated) {
    return (
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (summary.items.length === 0) {
    return (
      <div className="container-page py-10">
        <EmptyState
          icon={<ShoppingBag />}
          title={t.common.cart.empty}
          description={t.common.cart.emptyDesc}
          action={
            <Button size="lg" asChild>
              <Link href="/products">{t.common.cart.startShopping}</Link>
            </Button>
          }
          className="rounded-[28px] border border-dashed border-border py-24"
        />
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-semibold">{t.common.nav.bestSellers}</h2>
          <ProductRail products={recommendations} />
        </section>
      </div>
    );
  }

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">{t.shop.cartPage.title}</h1>
          <p className="mt-1 text-muted-foreground">{fmt(t.common.cart.items, { n: summary.count })}</p>
        </div>
        <Button variant="ghost" asChild>
          <Link href="/products">
            <ArrowLeft />
            {t.common.cart.continueShopping}
          </Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <FreeShippingMeter remaining={summary.freeShippingRemaining} />
          <div className="divide-y divide-border rounded-[24px] border border-border bg-card">
            {summary.items.map((item) => (
              <div key={item.variant.id} className="p-4 sm:p-6">
                <CartLineRow item={item} />
                <button
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
                  onClick={() => {
                    if (!wish.ids.includes(item.product.id)) wish.toggle(item.product.id);
                    remove(item.variant.id);
                    toast.success(t.shop.cartPage.movedToWishlist);
                  }}
                >
                  <Heart className="size-3.5" />
                  {t.shop.cartPage.saveForLater}
                </button>
              </div>
            ))}
          </div>
          <button onClick={clear} className="text-sm text-muted-foreground underline-offset-4 hover:text-destructive hover:underline">
            {t.shop.cartPage.clearCart}
          </button>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="space-y-5 rounded-[24px] border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">{t.shop.cartPage.summary}</h2>
            <CouponBox summary={summary} />
            <SummaryLines summary={summary} />
            <Button size="xl" className="w-full" asChild>
              <Link href="/checkout">
                <Lock className="size-4" />
                {t.common.cart.checkout}
              </Link>
            </Button>
            <div className="flex flex-wrap justify-center gap-1.5">
              {ONLINE_METHODS.map((m) => (
                <PaymentMark key={m} method={m} className="h-6 min-w-11 text-[8px]" />
              ))}
            </div>
          </div>
        </aside>
      </div>

      {recommendations.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-semibold">{t.common.cart.youMayNeed}</h2>
          <ProductRail products={recommendations} />
        </section>
      )}
    </div>
  );
}
