"use client";

import { Tag, X } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/lib/api/core";
import { quoteCart } from "@/lib/api/shop";
import { toast } from "sonner";
import type { CartSummary } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { useT } from "@/lib/i18n/client";
import { fmt, formatTZS } from "@/lib/utils";
import { useCart } from "@/stores";

export function CouponBox({ summary }: { summary: CartSummary }) {
  const { t } = useT();
  const lines = useCart((s) => s.lines);
  const apply = useCart((s) => s.applyCoupon);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);

  if (summary.coupon && !summary.couponError) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-success/30 bg-success-soft px-3.5 py-2.5 text-sm">
        <span className="flex items-center gap-2 font-medium text-success">
          <Tag className="size-4" />
          {fmt(t.common.cart.couponApplied, { code: summary.coupon.code })}
        </span>
        <button onClick={() => apply(null)} className="text-muted-foreground hover:text-foreground" aria-label={t.common.cart.removeCoupon}>
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setChecking(true);
          try {
            const quote = await quoteCart({ lines, couponCode: code.trim() });
            const found = quote.coupon;
            if (!found || quote.couponError === "invalid") return toast.error(t.common.cart.couponInvalid);
            if (quote.couponError === "min_spend") return toast.error(fmt(t.common.cart.couponMinSpend, { amount: formatTZS(found.minSpend) }));
            apply(found);
            setCode("");
            toast.success(fmt(t.common.cart.couponApplied, { code: found.code }));
          } catch (err) {
            toast.error(err instanceof ApiError && err.status === 422 ? t.common.cart.couponInvalid : t.common.misc.error);
          } finally {
            setChecking(false);
          }
        }}
      >
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t.common.cart.couponPlaceholder} className="h-10 uppercase" aria-label={t.common.cart.coupon} />
        <Button type="submit" variant="secondary" disabled={!code.trim()} loading={checking}>
          {t.common.actions.apply}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">{t.common.cart.tryCoupons}</p>
    </div>
  );
}

export function SummaryLines({ summary, shippingLabel }: { summary: CartSummary; shippingLabel?: string }) {
  const { t } = useT();
  return (
    <dl className="space-y-2.5 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">{t.common.cart.subtotal}</dt>
        <dd className="font-medium tabular-nums">{formatTZS(summary.subtotal)}</dd>
      </div>
      {summary.discount > 0 && (
        <div className="flex justify-between text-success">
          <dt>
            {t.common.cart.discount} {summary.coupon && `(${summary.coupon.code})`}
          </dt>
          <dd className="tabular-nums">−{formatTZS(summary.discount)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-muted-foreground">{t.common.cart.shipping}</dt>
        <dd className="tabular-nums">
          {summary.shipping == null ? (
            <span className="text-muted-foreground">{shippingLabel ?? t.common.cart.shippingCalc}</span>
          ) : summary.shipping === 0 ? (
            <span className="font-semibold text-success">{t.common.cart.free}</span>
          ) : (
            formatTZS(summary.shipping)
          )}
        </dd>
      </div>
      <div className="flex items-baseline justify-between border-t border-border pt-3">
        <dt className="font-semibold">{t.common.cart.total}</dt>
        <dd className="font-display text-2xl font-semibold tabular-nums">{formatTZS(summary.total)}</dd>
      </div>
      <p className="text-right text-xs text-muted-foreground">{t.common.cart.vatIncluded}</p>
    </dl>
  );
}
