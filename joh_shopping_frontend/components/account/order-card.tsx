"use client";

import { useShop } from "@/lib/data/shop-context";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import type { Order } from "@/types";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { ProductImage } from "@/components/shop/product-card";
import { OrderProgress, OrderStatusBadge } from "@/components/shop/order-timeline";
import { myOrders } from "@/lib/api/shop";
import { useT } from "@/lib/i18n/client";
import { fmt, formatDate, formatTZS } from "@/lib/utils";
import { useAuth } from "@/stores";

export function useMyOrders() {
  const user = useAuth((s) => s.user);
  return useQuery({ queryKey: ["my-orders", user?.id], queryFn: () => myOrders(), enabled: !!user });
}

export const ACTIVE_STATUSES: Order["status"][] = ["pending", "confirmed", "packed", "shipped", "out_for_delivery"];

export function OrderCard({ order, showProgress }: { order: Order; showProgress?: boolean }) {
  const { getProduct } = useShop();
  const { t, locale } = useT();
  const a = t.account.orders;
  const count = order.items.reduce((n, i) => n + i.qty, 0);
  return (
    <article className="rounded-[20px] border border-border bg-card transition hover:shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="font-display font-semibold">{order.number}</p>
          <p className="text-sm text-muted-foreground">{fmt(a.placed, { date: formatDate(order.createdAt, locale) })}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="flex flex-wrap items-center gap-4 px-5 py-4">
        <div className="flex -space-x-3">
          {order.items.slice(0, 4).map((it) => {
            const p = getProduct(it.productId);
            const v = p?.variants.find((x) => x.id === it.variantId);
            return (
              <div key={it.variantId} className="size-14 rounded-xl border-2 border-card bg-surface p-1">
                {p && <ProductImage product={p} color={v?.color} view={p.art.kind === "phone" ? "back" : undefined} />}
              </div>
            );
          })}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{order.items.map((i) => i.name).join(", ")}</p>
          <p className="text-xs text-muted-foreground">
            {fmt(a.items, { n: count })} · {formatTZS(order.total)}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/account/orders/${order.id}`}>
            {a.viewOrder}
            <ChevronRight />
          </Link>
        </Button>
      </div>
      {showProgress && ACTIVE_STATUSES.includes(order.status) && (
        <div className="border-t border-border px-5 py-4">
          <OrderProgress order={order} />
        </div>
      )}
    </article>
  );
}
