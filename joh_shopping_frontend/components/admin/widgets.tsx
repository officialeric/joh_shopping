"use client";

import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import type { OrderStatus, PaymentStatus, ReturnRequest } from "@/types";
import { PaymentMark } from "@/components/brand/payment-logos";
import { Badge } from "@/components/ui/primitives";
import { ProductImage } from "@/components/shop/product-card";
import { useAdminProductLookup } from "@/lib/api/hooks";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  delta?: number;
  hint?: string;
  tone?: "default" | "brand";
}) {
  return (
    <div className={cn("rounded-[20px] border p-5 shadow-soft", tone === "brand" ? "border-transparent bg-brand-gradient text-white" : "border-border bg-card")}>
      <div className="flex items-start justify-between">
        <p className={cn("text-sm", tone === "brand" ? "text-white/75" : "text-muted-foreground")}>{label}</p>
        <span className={cn("flex size-9 items-center justify-center rounded-xl", tone === "brand" ? "bg-white/15" : "bg-primary-soft text-primary")}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {(delta !== undefined || hint) && (
        <p className={cn("mt-1 flex items-center gap-1 text-xs", tone === "brand" ? "text-white/75" : "text-muted-foreground")}>
          {delta !== undefined && (
            <span className={cn("inline-flex items-center gap-0.5 font-semibold", tone === "brand" ? "text-white" : delta >= 0 ? "text-success" : "text-destructive")}>
              {delta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {hint}
        </p>
      )}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[20px] border border-border bg-card p-5 shadow-soft sm:p-6", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { t } = useT();
  const variant = status === "paid" ? "success" : status === "pending" ? "warning" : status === "failed" ? "danger" : "muted";
  return <Badge variant={variant}>{t.common.paymentStatus[status]}</Badge>;
}

export function ReturnStatusBadge({ status }: { status: ReturnRequest["status"] }) {
  const { t } = useT();
  const variant =
    status === "rejected" ? "danger" : ["completed", "refunded", "repaired"].includes(status) ? "success" : status === "requested" ? "warning" : "info";
  return <Badge variant={variant}>{t.common.returnStatus[status]}</Badge>;
}

export function MethodCell({ method }: { method: Parameters<typeof PaymentMark>[0]["method"] }) {
  return <PaymentMark method={method} className="h-7 min-w-16" />;
}

export function ProductThumb({ productId, color, className }: { productId: string; color?: string; className?: string }) {
  const p = useAdminProductLookup()(productId);
  return (
    <div className={cn("size-10 shrink-0 rounded-lg bg-surface p-0.5", className)}>
      {p && <ProductImage product={p} color={color} view={p.art.kind === "phone" ? "back" : undefined} />}
    </div>
  );
}

export const ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "packed", "shipped", "out_for_delivery", "delivered", "cancelled", "returned"];
