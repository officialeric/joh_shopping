"use client";

import { ShieldCheck, ShoppingBag, Trash2, Truck } from "lucide-react";
import { useMemo } from "react";
import { useShop } from "@/lib/data/shop-context";
import { useCartSummary } from "@/lib/use-cart";
import { Sheet, SheetContent } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { QuantityInput } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/feedback";
import { Progress } from "@/components/ui/primitives";
import { Link } from "@/components/ui/link";
import { useT } from "@/lib/i18n/client";
import { FREE_SHIPPING_DAR, type PricedLine } from "@/lib/cart";
import { variantLabel } from "@/lib/data/catalog";
import { fmt, formatTZS } from "@/lib/utils";
import { useCart, useHydrated, useUI } from "@/stores";
import { ProductImage } from "./product-card";
import { useProductActions } from "./product-actions";
import { Price } from "./price";

export function CartLineRow({ item, compact }: { item: PricedLine; compact?: boolean }) {
  const { t, locale } = useT();
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const setCartOpen = useUI((s) => s.setCartOpen);
  const { product, variant, line } = item;
  return (
    <div className="flex gap-4">
      <Link
        href={`/products/${product.slug}`}
        onClick={() => setCartOpen(false)}
        className={compact ? "size-20 shrink-0 rounded-xl bg-surface p-1.5" : "size-24 shrink-0 rounded-2xl bg-surface p-2 sm:size-28"}
      >
        <ProductImage product={product} color={variant.color} view={product.art.kind === "phone" ? "back" : undefined} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/products/${product.slug}`} onClick={() => setCartOpen(false)} className="line-clamp-2 text-sm font-medium hover:text-primary">
              {product.name}
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">{variantLabel(product, variant, locale)}</p>
          </div>
          <button
            onClick={() => remove(variant.id)}
            className="rounded-full p-1.5 text-muted-foreground transition hover:bg-primary-soft hover:text-primary"
            aria-label={t.common.actions.remove}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <QuantityInput size="sm" value={line.qty} onChange={(n) => setQty(variant.id, n)} max={Math.max(1, variant.stock)} />
          <div className="text-right">
            <Price price={item.lineTotal} size="sm" />
            {line.qty > 1 && <p className="text-[11px] text-muted-foreground">{formatTZS(item.unitPrice)} × {line.qty}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FreeShippingMeter({ remaining }: { remaining: number }) {
  const { t } = useT();
  const pct = ((FREE_SHIPPING_DAR - remaining) / FREE_SHIPPING_DAR) * 100;
  return (
    <div className="rounded-2xl bg-muted p-3.5">
      <p className="mb-2 flex items-center gap-2 text-xs font-medium">
        <Truck className="size-4 text-primary" />
        {remaining > 0 ? fmt(t.common.cart.freeShippingProgress, { amount: formatTZS(remaining) }) : t.common.cart.freeShippingUnlocked}
      </p>
      <Progress value={pct} className="h-1.5" indicatorClassName={remaining > 0 ? undefined : "bg-success"} />
    </div>
  );
}

export function CartDrawer() {
  const { t } = useT();
  const open = useUI((s) => s.cartOpen);
  const setOpen = useUI((s) => s.setCartOpen);
  const hydrated = useHydrated();
  const actions = useProductActions();
  const { compatibleProducts } = useShop();
  const summary = useCartSummary();

  const upsell = useMemo(() => {
    const inCart = new Set(summary.items.map((i) => i.product.id));
    const phone = summary.items.find((i) => i.product.art.kind === "phone");
    return phone ? compatibleProducts(phone.product, 6).filter((p) => !inCart.has(p.id)).slice(0, 2) : [];
  }, [summary.items, compatibleProducts]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        heading={
          <span className="flex items-center gap-2">
            {t.common.cart.title}
            {hydrated && summary.count > 0 && (
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-soft-foreground">{summary.count}</span>
            )}
          </span>
        }
      >
        {!hydrated || summary.items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={<ShoppingBag />}
              title={t.common.cart.empty}
              description={t.common.cart.emptyDesc}
              action={
                <Button asChild onClick={() => setOpen(false)}>
                  <Link href="/products">{t.common.cart.startShopping}</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <FreeShippingMeter remaining={summary.freeShippingRemaining} />
              <div className="space-y-5">
                {summary.items.map((item) => (
                  <CartLineRow key={item.variant.id} item={item} compact />
                ))}
              </div>
              {upsell.length > 0 && (
                <div className="border-t border-border pt-5">
                  <p className="mb-3 text-sm font-semibold">{t.common.cart.youMayNeed}</p>
                  <div className="grid gap-3">
                    {upsell.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border p-2.5">
                        <div className="size-12 shrink-0 rounded-xl bg-surface p-1">
                          <ProductImage product={p} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          <Price price={p.price} size="sm" />
                        </div>
                        <Button size="sm" variant="outline" onClick={() => actions.addToCart(p, undefined, 1, false)}>
                          {t.common.actions.add}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-4 border-t border-border bg-card px-5 py-5">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.common.cart.subtotal}</span>
                  <span className="font-medium tabular-nums">{formatTZS(summary.subtotal)}</span>
                </div>
                {summary.discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>{t.common.cart.discount}</span>
                    <span className="tabular-nums">−{formatTZS(summary.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.common.cart.shipping}</span>
                  <span className="text-muted-foreground">{t.common.cart.shippingCalc}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="lg" asChild onClick={() => setOpen(false)}>
                  <Link href="/cart">{t.common.cart.viewCart}</Link>
                </Button>
                <Button size="lg" asChild onClick={() => setOpen(false)}>
                  <Link href="/checkout">{t.common.cart.checkout}</Link>
                </Button>
              </div>
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-success" />
                {t.common.cart.secureCheckout}
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
