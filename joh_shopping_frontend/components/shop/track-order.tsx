"use client";

import { useShop } from "@/lib/data/shop-context";
import { PackageSearch, Phone, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Order } from "@/types";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { trackOrder } from "@/lib/api/shop";
import { useT } from "@/lib/i18n/client";
import { fmt, formatDate, formatTZS } from "@/lib/utils";
import { OrderProgress, OrderStatusBadge, OrderTimeline } from "./order-timeline";
import { ProductImage } from "./product-card";

export function TrackOrder() {
  const { getProduct, orderItemLabel, getStore } = useShop();
  const { t, locale } = useT();
  const tr = t.shop.track;
  const sp = useSearchParams();
  const [number, setNumber] = useState(sp.get("order") ?? "");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<Order | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      setOrder(await trackOrder(number, contact));
    } catch {
      setOrder(null);
      setError(tr.notFound);
    } finally {
      setLoading(false);
    }
  };

  const store = getStore(order?.pickupStoreId);

  return (
    <div className="container-page -mt-10 pb-10">
      <form onSubmit={submit} className="relative grid gap-4 rounded-[24px] border border-border bg-card p-6 shadow-soft sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label={tr.orderNumber} htmlFor="t-number">
          <Input id="t-number" required placeholder={tr.orderNumberPlaceholder} value={number} onChange={(e) => setNumber(e.target.value.toUpperCase())} />
        </Field>
        <Field label={tr.contact} htmlFor="t-contact">
          <Input id="t-contact" required value={contact} onChange={(e) => setContact(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" loading={loading}>
          <Search />
          {tr.submit}
        </Button>
        <p className="text-xs text-muted-foreground sm:col-span-3">{tr.demoHint}</p>
      </form>

      {error && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-destructive/30 bg-primary-soft p-4 text-sm text-primary-soft-foreground">
          <PackageSearch className="size-5 shrink-0" />
          {error}
        </div>
      )}

      {order && (
        <div className="mt-8 grid animate-[fade-up_0.4s_ease-out] gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-6 rounded-[24px] border border-border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-2xl font-semibold">{order.number}</p>
                <p className="text-sm text-muted-foreground">{fmt(tr.placedOn, { date: formatDate(order.createdAt, locale) })}</p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
            <OrderProgress order={order} />
            <div className="grid gap-3 sm:grid-cols-2">
              {order.courier && (
                <div className="rounded-xl bg-muted p-4 text-sm">
                  <p className="text-xs text-muted-foreground">{tr.courier}</p>
                  <p className="mt-1 font-medium">{order.courier.name}</p>
                  <p className="text-muted-foreground">
                    {tr.trackingNo}: {order.courier.trackingNumber}
                  </p>
                  <a href={`tel:${order.courier.phone}`} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Phone className="size-3.5" />
                    {order.courier.phone}
                  </a>
                </div>
              )}
              <div className="rounded-xl bg-muted p-4 text-sm">
                <p className="text-xs text-muted-foreground">{store ? t.shop.checkout.pickupAt : t.shop.checkout.deliverTo}</p>
                <p className="mt-1 font-medium">{store?.name ?? order.address?.fullName}</p>
                <p className="text-muted-foreground">{store?.address ?? `${order.address?.district}, ${order.address?.region}`}</p>
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold">{tr.items}</p>
              <ul className="space-y-3">
                {order.items.map((it) => {
                  const p = getProduct(it.productId);
                  return (
                    <li key={it.variantId} className="flex items-center gap-3">
                      <div className="size-12 shrink-0 rounded-xl bg-surface p-1">{p && <ProductImage product={p} view={p.art.kind === "phone" ? "back" : undefined} />}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{it.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {orderItemLabel(it, locale)} × {it.qty}
                        </p>
                      </div>
                      <span className="text-sm tabular-nums">{formatTZS(it.price * it.qty)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <div className="rounded-[24px] border border-border bg-card p-6">
            <OrderTimeline order={order} />
          </div>
        </div>
      )}
    </div>
  );
}
