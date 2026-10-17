"use client";

import { Phone, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/primitives";
import { AccountHeader } from "@/components/account/account-shell";
import { ACTIVE_STATUSES, useMyOrders } from "@/components/account/order-card";
import { OrderProgress, OrderStatusBadge, OrderTimeline } from "@/components/shop/order-timeline";
import { useT } from "@/lib/i18n/client";
import { fmt, formatDate } from "@/lib/utils";

export default function TrackingPage() {
  const { t, locale } = useT();
  const tr = t.account.tracking;
  const { data, isLoading } = useMyOrders();
  const active = data?.filter((o) => ACTIVE_STATUSES.includes(o.status)) ?? [];

  return (
    <>
      <AccountHeader title={tr.title} subtitle={tr.subtitle} />
      {isLoading ? (
        <Skeleton className="h-96" />
      ) : active.length === 0 ? (
        <EmptyState icon={<Truck />} title={tr.none} description={tr.noneDesc} className="rounded-[24px] border border-dashed border-border" />
      ) : (
        <div className="space-y-6">
          {active.map((o) => (
            <section key={o.id} className="rounded-[24px] border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
                <div>
                  <Link href={`/account/orders/${o.id}`} className="font-display text-lg font-semibold hover:text-primary">
                    {o.number}
                  </Link>
                  <p className="text-sm text-muted-foreground">{fmt(t.account.orders.placed, { date: formatDate(o.createdAt, locale) })}</p>
                </div>
                <OrderStatusBadge status={o.status} />
              </div>
              <div className="p-5">
                <OrderProgress order={o} />
              </div>
              <div className="grid gap-6 border-t border-border p-5 md:grid-cols-[1fr_260px]">
                <OrderTimeline order={o} />
                {o.courier && (
                  <div className="h-fit rounded-2xl bg-muted p-4 text-sm">
                    <p className="text-xs text-muted-foreground">{t.account.orderDetail.courier}</p>
                    <p className="font-semibold">{o.courier.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.account.orderDetail.trackingNo}: {o.courier.trackingNumber}
                    </p>
                    <Button size="sm" variant="outline" className="mt-3 w-full" asChild>
                      <a href={`tel:${o.courier.phone}`}>
                        <Phone />
                        {tr.callCourier}
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
