"use client";

import { ArrowLeft, Mail, Phone, Save, Smartphone, Truck } from "lucide-react";
import { useParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import type { Order, OrderStatus } from "@/types";
import { PaymentMark } from "@/components/brand/payment-logos";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/primitives";
import { InvoiceButton } from "@/components/shop/invoice";
import { OrderStatusBadge, OrderTimeline } from "@/components/shop/order-timeline";
import { RequirePermission, useAdmin } from "@/components/admin/admin-shell";
import { ORDER_STATUSES, Panel, PaymentStatusBadge, ProductThumb } from "@/components/admin/widgets";
import { useQuery } from "@tanstack/react-query";
import { assignCourier, assignImeis, orderPayments, updateOrderStatus } from "@/lib/api/admin";
import { apiErrorMessage } from "@/lib/api/errors";
import { useAdminAll, useAdminRecord, useInvalidateAdmin } from "@/lib/api/hooks";
import { useShop } from "@/lib/data/shop-context";
import { useT } from "@/lib/i18n/client";
import { formatDateTime, formatTZS } from "@/lib/utils";

function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useAdminRecord("orders", id);
  const { data: products } = useAdminAll("products");
  const { t } = useT();
  if (isLoading || !products) return <Skeleton className="h-[600px]" />;
  if (!order) return <p className="text-muted-foreground">{t.account.orderDetail.notFound}</p>;
  const phoneIds = new Set(products.filter((p) => p.categoryId === "c-phones").map((p) => p.id));
  return <OrderEditor key={`${order.id}-${order.timeline.length}`} order={order} isPhone={(productId) => phoneIds.has(productId)} />;
}

function OrderEditor({ order, isPhone }: { order: Order; isPhone: (productId: string) => boolean }) {
  const { t, locale } = useT();
  const { orderItemLabel, getStore } = useShop();
  const o = t.admin.orders;
  const { can } = useAdmin();
  const refresh = useInvalidateAdmin();
  const canEdit = can("orders.manage");
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [note, setNote] = useState("");
  const [courier, setCourier] = useState(order.courier ?? { name: "Joh Express", trackingNumber: "", phone: "+255712000200" });
  const [imeis, setImeis] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(order.items.filter((i) => isPhone(i.productId)).map((i) => [i.variantId, i.imei ?? Array(i.qty).fill("")])),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const { data: payments } = useQuery({
    queryKey: ["admin", "payments", "order", order.id],
    queryFn: () => orderPayments(order.id),
    enabled: can("payments.view") || can("payments.refund"),
  });
  const payment = payments?.[0];
  const store = getStore(order.pickupStoreId);
  const phoneLines = order.items.filter((i) => imeis[i.variantId]);

  const run = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(msg);
      refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err, t));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {t.admin.nav.orders}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{order.number}</h1>
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(order.createdAt, locale)}</p>
        </div>
        <div className="flex gap-2">
          <InvoiceButton order={order} label={o.invoice} />
          <InvoiceButton order={order} packingSlip label={o.packingSlip} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Panel title={o.items}>
            <ul className="divide-y divide-border">
              {order.items.map((it) => (
                <li key={it.variantId} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <ProductThumb productId={it.productId} className="size-14" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/products/${it.productId}`} className="font-medium hover:text-primary">
                      {it.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{orderItemLabel(it, locale)}</p>
                  </div>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {formatTZS(it.price)} × {it.qty}
                  </span>
                  <span className="w-28 text-right font-medium tabular-nums">{formatTZS(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 ml-auto max-w-xs space-y-1.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t.common.cart.subtotal}</dt>
                <dd className="tabular-nums">{formatTZS(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-success">
                  <dt>
                    {t.common.cart.discount} ({order.couponCode})
                  </dt>
                  <dd className="tabular-nums">−{formatTZS(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t.common.cart.shipping}</dt>
                <dd className="tabular-nums">{order.shippingFee ? formatTZS(order.shippingFee) : t.common.cart.free}</dd>
              </div>
              <div className="flex justify-between pt-1 text-base font-semibold">
                <dt>{t.common.cart.total}</dt>
                <dd className="tabular-nums">{formatTZS(order.total)}</dd>
              </div>
            </dl>
          </Panel>

          {phoneLines.length > 0 && (
            <Panel
              title={
                <span className="flex items-center gap-2">
                  <Smartphone className="size-4 text-primary" />
                  {o.imeiAssign}
                </span>
              }
            >
              <div className="space-y-4">
                {phoneLines.map((it) => (
                  <div key={it.variantId}>
                    <p className="mb-2 text-sm font-medium">
                      {it.name} <span className="text-muted-foreground">· {orderItemLabel(it, locale)}</span>
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {imeis[it.variantId]!.map((code, idx) => (
                        <Input
                          key={idx}
                          className="font-mono"
                          inputMode="numeric"
                          placeholder={`IMEI ${idx + 1}`}
                          value={code}
                          disabled={!canEdit}
                          onChange={(e) =>
                            setImeis((m) => ({ ...m, [it.variantId]: m[it.variantId]!.map((c, j) => (j === idx ? e.target.value.replace(/\D/g, "").slice(0, 15) : c)) }))
                          }
                          aria-invalid={code.length > 0 && code.length !== 15}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {canEdit && (
                  <Button
                    variant="outline"
                    loading={busy === "imei"}
                    onClick={() => {
                      const bad = Object.values(imeis).flat().some((c) => c && c.length !== 15);
                      if (bad) return toast.error(t.admin.inventory.imeiInvalid);
                      run("imei", () => assignImeis(order.id, imeis), o.imeiSaved);
                    }}
                  >
                    <Save />
                    {t.admin.common.save}
                  </Button>
                )}
              </div>
            </Panel>
          )}

          <Panel title={o.timeline}>
            <OrderTimeline order={order} />
          </Panel>
        </div>

        <div className="space-y-6">
          {canEdit && (
            <Panel title={o.updateStatus}>
              <div className="space-y-3">
                <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} aria-label={o.updateStatus}>
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t.common.orderStatus[s]}
                    </option>
                  ))}
                </NativeSelect>
                <Textarea className="min-h-20" placeholder={o.addNote} value={note} onChange={(e) => setNote(e.target.value)} />
                <Button className="w-full" disabled={status === order.status} loading={busy === "status"} onClick={() => run("status", () => updateOrderStatus(order.id, status, note), o.statusUpdated)}>
                  {o.updateStatus}
                </Button>
              </div>
            </Panel>
          )}

          <Panel title={o.customerInfo}>
            <Link href={`/admin/customers/${order.customerId}`} className="font-semibold hover:text-primary">
              {order.customerName}
            </Link>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="size-4" />
              {order.customerEmail}
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="size-4" />
              {order.customerPhone}
            </p>
            {order.notes && <p className="mt-3 rounded-xl bg-warning-soft p-3 text-sm">{order.notes}</p>}
          </Panel>

          <Panel title={o.delivery}>
            <p className="text-sm font-medium">{t.common.delivery[order.deliveryMethod]}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {store ? `${store.name} — ${store.address}` : `${order.address?.street}, ${order.address?.district}, ${order.address?.region}`}
            </p>
            {order.address?.landmark && <p className="text-xs text-muted-foreground italic">{order.address.landmark}</p>}
            {order.deliveryMethod !== "pickup" && (
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Truck className="size-4 text-primary" />
                  {o.courier}
                </p>
                <Field label={o.courierName} htmlFor="c-name">
                  <Input id="c-name" value={courier.name} disabled={!canEdit} onChange={(e) => setCourier({ ...courier, name: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label={o.trackingNo} htmlFor="c-track">
                    <Input id="c-track" value={courier.trackingNumber} disabled={!canEdit} onChange={(e) => setCourier({ ...courier, trackingNumber: e.target.value })} />
                  </Field>
                  <Field label={o.courierPhone} htmlFor="c-phone">
                    <Input id="c-phone" value={courier.phone} disabled={!canEdit} onChange={(e) => setCourier({ ...courier, phone: e.target.value })} />
                  </Field>
                </div>
                {canEdit && (
                  <Button variant="outline" className="w-full" loading={busy === "courier"} onClick={() => run("courier", () => assignCourier(order.id, courier), o.courierSaved)}>
                    {o.assignCourier}
                  </Button>
                )}
              </div>
            )}
          </Panel>

          <Panel title={o.payment}>
            <div className="flex items-center justify-between">
              <PaymentMark method={order.paymentMethod} />
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>
            {payment && (
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.admin.payments.reference}</dt>
                  <dd className="font-mono text-xs">{payment.reference}</dd>
                </div>
                {payment.payerPhone && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t.admin.payments.payer}</dt>
                    <dd>{payment.payerPhone}</dd>
                  </div>
                )}
                {payment.refunded > 0 && (
                  <div className="flex justify-between text-destructive">
                    <dt>{t.admin.payments.refunded}</dt>
                    <dd>{formatTZS(payment.refunded)}</dd>
                  </div>
                )}
              </dl>
            )}
            {can("payments.view") && (
              <Button variant="ghost" size="sm" className="mt-3" asChild>
                <Link href="/admin/payments">{t.admin.nav.payments} →</Link>
              </Button>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrderPage() {
  return (
    <RequirePermission perm="orders.view">
      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <OrderDetail />
      </Suspense>
    </RequirePermission>
  );
}
