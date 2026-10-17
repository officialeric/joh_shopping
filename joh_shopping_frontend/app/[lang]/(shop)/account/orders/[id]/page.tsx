"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Headphones, Phone, RefreshCcw, RotateCcw, Star, XCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { PaymentMark } from "@/components/brand/payment-logos";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { ConfirmDialog } from "@/components/ui/overlays";
import { Skeleton } from "@/components/ui/primitives";
import { InvoiceButton } from "@/components/shop/invoice";
import { OrderStatusBadge, OrderTimeline } from "@/components/shop/order-timeline";
import { ProductImage } from "@/components/shop/product-card";
import { useShop } from "@/lib/data/shop-context";
import { cancelOrder, myOrder } from "@/lib/api/shop";
import { useT } from "@/lib/i18n/client";
import { fmt, formatDate, formatTZS } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api/errors";
import { useCart, useUI } from "@/stores";

function OrderDetail() {
  const { getProduct, orderItemLabel, getStore } = useShop();
  const { t, locale } = useT();
  const d = t.account.orderDetail;
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const add = useCart((s) => s.add);
  const setCartOpen = useUI((s) => s.setCartOpen);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { data: order, isLoading, isError } = useQuery({ queryKey: ["my-order", id], queryFn: () => myOrder(id) });

  if (isLoading) return <Skeleton className="h-[600px]" />;
  if (isError || !order) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">{d.notFound}</p>
        <Button className="mt-4" asChild>
          <Link href="/account/orders">{d.back}</Link>
        </Button>
      </div>
    );
  }

  const store = getStore(order.pickupStoreId);
  const canCancel = ["pending", "confirmed"].includes(order.status);
  const delivered = order.status === "delivered";

  return (
    <div className="space-y-6">
      <Link href="/account/orders" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {d.back}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold sm:text-3xl">{fmt(d.title, { number: order.number })}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-muted-foreground">{fmt(t.account.orders.placed, { date: formatDate(order.createdAt, locale, { dateStyle: "long" }) })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <InvoiceButton order={order} />
          <Button
            variant="outline"
            onClick={() => {
              order.items.forEach((it) => add({ productId: it.productId, variantId: it.variantId, qty: it.qty }));
              setCartOpen(true);
            }}
          >
            <RefreshCcw />
            {t.common.actions.reorder}
          </Button>
          {canCancel && (
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmCancel(true)}>
              <XCircle />
              {d.cancel}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-[24px] border border-border bg-card p-6">
            <h2 className="mb-4 font-semibold">{d.items}</h2>
            <ul className="divide-y divide-border">
              {order.items.map((it) => {
                const p = getProduct(it.productId);
                const v = p?.variants.find((x) => x.id === it.variantId);
                return (
                  <li key={it.variantId} className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
                    <Link href={p ? `/products/${p.slug}` : "#"} className="size-20 shrink-0 rounded-2xl bg-surface p-2">
                      {p && <ProductImage product={p} color={v?.color} view={p.art.kind === "phone" ? "back" : undefined} />}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{it.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {orderItemLabel(it, locale)} · × {it.qty}
                      </p>
                      {it.imei && (
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {d.imei}: {it.imei.join(", ")}
                        </p>
                      )}
                      {delivered && p && (
                        <Link href={`/products/${p.slug}#reviews`} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                          <Star className="size-3.5" />
                          {d.writeReview}
                        </Link>
                      )}
                    </div>
                    <span className="font-medium tabular-nums">{formatTZS(it.price * it.qty)}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-[24px] border border-border bg-card p-6">
              <h2 className="mb-4 font-semibold">{d.delivery}</h2>
              <p className="text-xs text-muted-foreground">{store ? d.pickupStore : d.deliveryAddress}</p>
              <p className="mt-1 font-medium">{store?.name ?? order.address?.fullName}</p>
              <p className="text-sm text-muted-foreground">{store?.address ?? `${order.address?.street}, ${order.address?.district}, ${order.address?.region}`}</p>
              <p className="mt-2 text-sm">{t.common.delivery[order.deliveryMethod]}</p>
              {order.courier && (
                <div className="mt-4 rounded-xl bg-muted p-3 text-sm">
                  <p className="text-xs text-muted-foreground">{d.courier}</p>
                  <p className="font-medium">{order.courier.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.trackingNo}: {order.courier.trackingNumber}
                  </p>
                  <a href={`tel:${order.courier.phone}`} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    <Phone className="size-3.5" />
                    {order.courier.phone}
                  </a>
                </div>
              )}
            </section>
            <section className="rounded-[24px] border border-border bg-card p-6">
              <h2 className="mb-4 font-semibold">{d.summary}</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.common.cart.subtotal}</dt>
                  <dd>{formatTZS(order.subtotal)}</dd>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-success">
                    <dt>
                      {t.common.cart.discount} {order.couponCode && `(${order.couponCode})`}
                    </dt>
                    <dd>−{formatTZS(order.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.common.cart.shipping}</dt>
                  <dd>{order.shippingFee ? formatTZS(order.shippingFee) : t.common.cart.free}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold">
                  <dt>{t.common.cart.total}</dt>
                  <dd className="font-display text-lg">{formatTZS(order.total)}</dd>
                </div>
              </dl>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-muted p-3 text-sm">
                <span className="text-muted-foreground">{d.paidWith}</span>
                <PaymentMark method={order.paymentMethod} />
              </div>
              <p className="mt-2 text-right text-xs text-muted-foreground">{t.common.paymentStatus[order.paymentStatus]}</p>
            </section>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[24px] border border-border bg-card p-6">
            <h2 className="mb-5 font-semibold">{d.timeline}</h2>
            <OrderTimeline order={order} />
          </section>
          {delivered && (
            <Button variant="outline" size="lg" className="w-full" asChild>
              <Link href={`/account/returns?order=${order.id}`}>
                <RotateCcw />
                {d.requestReturn}
              </Link>
            </Button>
          )}
          <section className="rounded-[24px] bg-neutral-950 p-6 text-white">
            <Headphones className="size-6 text-brand-400" />
            <p className="mt-3 font-semibold">{d.needHelp}</p>
            <Link href="/contact" className="mt-1 inline-block text-sm text-white/70 hover:text-white">
              {d.contactSupport} →
            </Link>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title={d.cancelTitle}
        description={d.cancelDesc}
        confirmLabel={d.cancel}
        cancelLabel={t.common.actions.back}
        onConfirm={async () => {
          try {
            await cancelOrder(order.id);
            qc.invalidateQueries({ queryKey: ["my-order", id] });
            qc.invalidateQueries({ queryKey: ["my-orders"] });
            toast.success(d.cancelled);
          } catch (err) {
            toast.error(apiErrorMessage(err, t));
          }
        }}
      />
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <OrderDetail />
    </Suspense>
  );
}
