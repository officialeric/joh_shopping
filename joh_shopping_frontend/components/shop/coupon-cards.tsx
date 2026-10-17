"use client";

import { Copy, Ticket } from "lucide-react";
import { toast } from "sonner";
import type { Coupon } from "@/types";
import { useT } from "@/lib/i18n/client";
import { fmt, formatTZS } from "@/lib/utils";

export function CouponCards({ coupons }: { coupons: Coupon[] }) {
  const { t, locale } = useT();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {coupons.map((c) => (
        <div key={c.id} className="relative flex overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex w-20 shrink-0 flex-col items-center justify-center bg-brand-gradient text-white">
            <Ticket className="size-6" />
            <span className="mt-1 font-display text-lg font-bold">
              {c.type === "percent" ? `${c.value}%` : c.type === "fixed" ? `${c.value / 1000}K` : "🚚"}
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between border-l-2 border-dashed border-border p-4">
            <div>
              <p className="text-sm font-semibold">{c.description[locale]}</p>
              {c.minSpend > 0 && <p className="text-xs text-muted-foreground">{fmt(t.shop.deals.minSpend, { amount: formatTZS(c.minSpend) })}</p>}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(c.code);
                toast.success(`${t.common.actions.copied}: ${c.code}`);
              }}
              className="mt-3 inline-flex w-fit items-center gap-2 rounded-lg border border-dashed border-primary/50 bg-primary-soft px-3 py-1.5 font-mono text-sm font-semibold text-primary-soft-foreground transition hover:bg-brand-100 dark:hover:bg-brand-950"
              aria-label={t.shop.deals.copyCode}
            >
              {c.code}
              <Copy className="size-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
