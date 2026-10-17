"use client";

import { useShop } from "@/lib/data/shop-context";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, PartyPopper } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PaymentMark } from "@/components/brand/payment-logos";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/primitives";
import { getOrderByNumber } from "@/lib/api/shop";
import { useT } from "@/lib/i18n/client";
import { formatTZS } from "@/lib/utils";
import { useAuth } from "@/stores";
import { ProductImage } from "./product-card";
import { OrderTimeline } from "./order-timeline";

export function OrderSuccess() {
  const { getProduct, orderItemLabel, getStore } = useShop();
  const { t, locale } = useT();
  const s = t.shop.success;
  const number = useSearchParams().get("order") ?? "";
  const user = useAuth((st) => st.user);
  const { data: order, isLoading, isError } = useQuery({ queryKey: ["order", number], queryFn: () => getOrderByNumber(number), enabled: !!number });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-16">
        <Skeleton className="mx-auto size-20 rounded-full" />
        <Skeleton className="mx-auto h-8 w-2/3" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (isError || !order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-muted-foreground">{s.notFound}</p>
        <Button className="mt-6" asChild>
          <Link href="/">{t.common.actions.goHome}</Link>
        </Button>
      </div>
    );
  }

  const store = getStore(order.pickupStoreId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <div className="text-center">
        <div className="relative mx-auto mb-6 flex size-20 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-success/20" />
          <span className="relative flex size-20 items-center justify-center rounded-full bg-success text-white shadow-lg">
            <Check className="size-10" strokeWidth={3} />
          </span>
        </div>
        <h1 className="flex items-center justify-center gap-2 text-3xl font-semibold sm:text-4xl">
          {s.title}
          <PartyPopper className="size-7 text-primary" />
        </h1>
        <p className="mt-2 text-muted-foreground">{s.subtitle}</p>
        <button
          onClick={() => {
            navigator.clipboard.writeText(order.number);
            toast.success(t.common.actions.copied);
          }}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 font-display font-semibold transition hover:border-primary"
        >
          <span className="text-sm font-normal text-muted-foreground">{s.orderNumber}:</span>
          {order.number}
          <Copy className="size-4 text-muted-foreground" />
        </button>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4 rounded-[24px] border border-border bg-card p-6">
          <ul className="space-y-4">
            {order.items.map((it) => {
              const p = getProduct(it.productId);
              const v = p?.variants.find((x) => x.id === it.variantId);
              return (
                <li key={it.variantId} className="flex items-center gap-3">
                  <div className="size-14 shrink-0 rounded-xl bg-surface p-1">{p && <ProductImage product={p} color={v?.color} view={p.art.kind === "phone" ? "back" : undefined} />}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{it.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {orderItemLabel(it, locale)} × {it.qty}
                    </p>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{formatTZS(it.price * it.qty)}</span>
                </li>
              );
            })}
          </ul>
          <dl className="space-y-1.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t.common.cart.subtotal}</dt>
              <dd>{formatTZS(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-success">
                <dt>{t.common.cart.discount}</dt>
                <dd>−{formatTZS(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t.common.cart.shipping}</dt>
              <dd>{order.shippingFee ? formatTZS(order.shippingFee) : t.common.cart.free}</dd>
            </div>
            <div className="flex justify-between pt-2 font-semibold">
              <dt>{t.common.cart.total}</dt>
              <dd className="font-display text-lg">{formatTZS(order.total)}</dd>
            </div>
          </dl>
          <div className="flex items-center justify-between rounded-xl bg-success-soft px-4 py-3 text-sm">
            <span className="flex items-center gap-2 font-medium text-success">
              <Check className="size-4" />
              {order.paymentStatus === "paid"
                ? s.paid
                : order.paymentMethod === "cod"
                  ? t.common.payment.codDesc
                  : order.paymentStatus === "failed"
                    ? s.paymentFailed
                    : s.paymentPending}
            </span>
            <PaymentMark method={order.paymentMethod} />
          </div>
          {(order.address || store) && (
            <div className="rounded-xl bg-muted p-4 text-sm">
              <p className="text-xs text-muted-foreground">{store ? t.shop.checkout.pickupAt : t.shop.checkout.deliverTo}</p>
              <p className="mt-1 font-medium">{store ? store.name : order.address?.fullName}</p>
              <p className="text-muted-foreground">{store ? store.address : `${order.address?.street}, ${order.address?.district}, ${order.address?.region}`}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-border bg-card p-6">
            <h2 className="mb-5 font-semibold">{s.whatNext}</h2>
            <OrderTimeline order={order} />
          </div>
          <div className="grid gap-2">
            <Button size="lg" asChild>
              <Link href={user ? `/account/orders/${order.id}` : `/track-order?order=${order.number}`}>{s.track}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/products">{s.continue}</Link>
            </Button>
          </div>
          {!user && (
            <Link href="/register" className="block rounded-2xl border border-dashed border-primary/40 bg-primary-soft/40 p-4 text-sm font-medium text-primary-soft-foreground hover:bg-primary-soft">
              {s.createAccount} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
