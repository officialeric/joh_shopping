"use client";

import { Check, CircleDot, Home, Package, PackageCheck, Truck, X, type LucideIcon } from "lucide-react";
import type { Order, OrderStatus } from "@/types";
import { Badge } from "@/components/ui/primitives";
import { useT } from "@/lib/i18n/client";
import { cn, formatDateTime } from "@/lib/utils";

const FLOW: { status: OrderStatus; icon: LucideIcon }[] = [
  { status: "pending", icon: CircleDot },
  { status: "confirmed", icon: Check },
  { status: "packed", icon: Package },
  { status: "shipped", icon: Truck },
  { status: "out_for_delivery", icon: Truck },
  { status: "delivered", icon: Home },
];

export function orderStatusVariant(status: OrderStatus) {
  if (status === "delivered") return "success" as const;
  if (status === "cancelled" || status === "returned") return "danger" as const;
  if (status === "pending") return "warning" as const;
  return "info" as const;
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useT();
  return <Badge variant={orderStatusVariant(status)}>{t.common.orderStatus[status]}</Badge>;
}

/** Horizontal progress bar for compact cards. */
export function OrderProgress({ order }: { order: Order }) {
  const { t } = useT();
  const flow = order.deliveryMethod === "pickup" ? FLOW.filter((f) => f.status !== "shipped" && f.status !== "out_for_delivery") : FLOW;
  const idx = flow.findIndex((f) => f.status === order.status);
  if (order.status === "cancelled" || order.status === "returned") return null;
  return (
    <div className="flex items-center">
      {flow.map((f, i) => (
        <div key={f.status} className="flex flex-1 items-center last:flex-none">
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition",
              i <= idx ? "border-primary bg-primary text-white" : "border-border bg-card text-muted-foreground",
              i === idx && "ring-4 ring-primary/15",
            )}
            title={t.common.orderStatus[f.status]}
          >
            <f.icon className="size-3.5" />
          </span>
          {i < flow.length - 1 && <span className={cn("h-0.5 flex-1", i < idx ? "bg-primary" : "bg-border")} />}
        </div>
      ))}
    </div>
  );
}

/** Vertical timeline with timestamps and descriptions. */
export function OrderTimeline({ order }: { order: Order }) {
  const { t, locale } = useT();
  const events = new Map(order.timeline.map((e) => [e.status, e]));
  const terminated = order.status === "cancelled" || order.status === "returned";
  const flow = order.deliveryMethod === "pickup" ? FLOW.filter((f) => f.status !== "shipped" && f.status !== "out_for_delivery") : FLOW;
  const currentIdx = flow.findIndex((f) => f.status === order.status);
  const steps = terminated
    ? [...order.timeline.map((e) => ({ status: e.status, icon: e.status === "cancelled" || e.status === "returned" ? X : PackageCheck }))]
    : flow;

  return (
    <ol className="relative space-y-0">
      {steps.map((s, i) => {
        const ev = events.get(s.status);
        const done = terminated ? true : i <= currentIdx;
        const current = terminated ? i === steps.length - 1 : i === currentIdx;
        const isLast = i === steps.length - 1;
        return (
          <li key={`${s.status}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && <span className={cn("absolute top-8 left-[15px] h-[calc(100%-32px)] w-0.5", done && !current ? "bg-primary" : "bg-border")} />}
            <span
              className={cn(
                "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2",
                done ? (s.status === "cancelled" || s.status === "returned" ? "border-destructive bg-destructive text-white" : "border-primary bg-primary text-white") : "border-border bg-card text-muted-foreground",
                current && !terminated && "ring-4 ring-primary/15",
              )}
            >
              <s.icon className="size-4" />
            </span>
            <div className="min-w-0 pt-1">
              <p className={cn("text-sm font-semibold", !done && "text-muted-foreground")}>{t.common.orderStatus[s.status]}</p>
              {(done || current) && <p className="text-xs text-muted-foreground">{t.common.orderStatusDesc[s.status]}</p>}
              {ev && <p className="mt-0.5 text-xs text-muted-foreground/80 tabular-nums">{formatDateTime(ev.at, locale)}</p>}
              {ev?.note && <p className="mt-1 text-xs italic">{ev.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
