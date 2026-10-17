"use client";

import { useShop } from "@/lib/data/shop-context";
import { Printer } from "lucide-react";
import type { Order } from "@/types";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/overlays";
import { useT } from "@/lib/i18n/client";
import { formatDate, formatTZS } from "@/lib/utils";

/** Printable tax invoice / packing slip. `print` CSS isolates `.invoice-print`. */
export function InvoiceDocument({ order, packingSlip }: { order: Order; packingSlip?: boolean }) {
  const { orderItemLabel, getStore, contact } = useShop();
  const { t, locale } = useT();
  const store = getStore(order.pickupStoreId);
  const vat = Math.round(order.total - order.total / 1.18);
  return (
    <div className="invoice-print space-y-6 bg-white p-2 text-sm text-neutral-900">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2">
          <Logo className="[&_span]:!text-neutral-900" />
          <p className="text-xs text-neutral-500">
            {contact.address}
            <br />
            {contact.phone} · {contact.email}
            <br />
            TIN: 123-456-789 · VRN: 40-012345-A
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-semibold">{packingSlip ? "PACKING SLIP" : t.account.orderDetail.invoice.toUpperCase()}</p>
          <p className="mt-1 font-medium">{order.number}</p>
          <p className="text-xs text-neutral-500">{formatDate(order.createdAt, locale)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 rounded-xl bg-neutral-50 p-4">
        <div>
          <p className="text-xs text-neutral-500">{t.common.misc.customer}</p>
          <p className="font-medium">{order.customerName}</p>
          <p className="text-xs">{order.customerPhone}</p>
          <p className="text-xs">{order.customerEmail}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">{store ? t.shop.checkout.pickupAt : t.shop.checkout.deliverTo}</p>
          <p className="font-medium">{store?.name ?? order.address?.fullName}</p>
          <p className="text-xs">{store?.address ?? `${order.address?.street}, ${order.address?.district}, ${order.address?.region}`}</p>
        </div>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-neutral-200 text-xs text-neutral-500">
            <th className="py-2 font-medium">{t.shop.cartPage.product}</th>
            <th className="py-2 text-center font-medium">{t.shop.cartPage.quantity}</th>
            {!packingSlip && <th className="py-2 text-right font-medium">{t.shop.cartPage.price}</th>}
            {!packingSlip && <th className="py-2 text-right font-medium">{t.shop.cartPage.total}</th>}
          </tr>
        </thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.variantId} className="border-b border-neutral-100 align-top">
              <td className="py-2.5">
                <p className="font-medium">{it.name}</p>
                <p className="text-xs text-neutral-500">{orderItemLabel(it, locale)}</p>
                {it.imei && <p className="font-mono text-[11px] text-neutral-500">IMEI: {it.imei.join(", ")}</p>}
              </td>
              <td className="py-2.5 text-center">{it.qty}</td>
              {!packingSlip && <td className="py-2.5 text-right tabular-nums">{formatTZS(it.price)}</td>}
              {!packingSlip && <td className="py-2.5 text-right tabular-nums">{formatTZS(it.price * it.qty)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {!packingSlip && (
        <div className="ml-auto w-64 space-y-1.5">
          <Row label={t.common.cart.subtotal} value={formatTZS(order.subtotal)} />
          {order.discount > 0 && <Row label={t.common.cart.discount} value={`−${formatTZS(order.discount)}`} />}
          <Row label={t.common.cart.shipping} value={order.shippingFee ? formatTZS(order.shippingFee) : t.common.cart.free} />
          <Row label="VAT 18% (incl.)" value={formatTZS(vat)} muted />
          <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold">
            <span>{t.common.cart.total}</span>
            <span>{formatTZS(order.total)}</span>
          </div>
          <p className="text-right text-xs text-neutral-500">
            {t.account.orderDetail.paidWith}: {order.paymentMethod === "card" ? t.common.payment.card : t.common.payment[order.paymentMethod]}
          </p>
        </div>
      )}
      <p className="border-t border-neutral-200 pt-4 text-center text-xs text-neutral-500">{t.common.brand.tagline}</p>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-xs text-neutral-500" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function InvoiceButton({ order, packingSlip, label }: { order: Order; packingSlip?: boolean; label?: string }) {
  const { t } = useT();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Printer />
          {label ?? t.account.orderDetail.downloadInvoice}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogTitle className="sr-only">{t.account.orderDetail.invoice}</DialogTitle>
        <InvoiceDocument order={order} packingSlip={packingSlip} />
        <div className="flex justify-end">
          <Button onClick={() => window.print()}>
            <Printer />
            {t.common.actions.print}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
