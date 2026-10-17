"use client";

import { Package, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/feedback";
import { Link } from "@/components/ui/link";
import { Skeleton, Tabs, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { AccountHeader } from "@/components/account/account-shell";
import { ACTIVE_STATUSES, OrderCard, useMyOrders } from "@/components/account/order-card";
import { useT } from "@/lib/i18n/client";

type Filter = "all" | "active" | "delivered" | "cancelled";

export default function OrdersPage() {
  const { t } = useT();
  const a = t.account.orders;
  const { data, isLoading } = useMyOrders();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    let rows = data ?? [];
    if (filter === "active") rows = rows.filter((o) => ACTIVE_STATUSES.includes(o.status));
    if (filter === "delivered") rows = rows.filter((o) => o.status === "delivered");
    if (filter === "cancelled") rows = rows.filter((o) => o.status === "cancelled" || o.status === "returned");
    if (q.trim()) {
      const needle = q.toLowerCase();
      rows = rows.filter((o) => o.number.toLowerCase().includes(needle) || o.items.some((i) => i.name.toLowerCase().includes(needle)));
    }
    return rows;
  }, [data, filter, q]);

  return (
    <>
      <AccountHeader title={a.title} subtitle={a.subtitle} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            {(Object.keys(a.filters) as Filter[]).map((f) => (
              <TabsTrigger key={f} value={f}>
                {a.filters[f]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={a.searchPlaceholder} className="h-10 pl-10" />
        </div>
      </div>
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title={a.empty}
            description={a.emptyDesc}
            action={
              <Button asChild>
                <Link href="/products">{t.common.cart.startShopping}</Link>
              </Button>
            }
            className="rounded-[24px] border border-dashed border-border"
          />
        ) : (
          list.map((o) => <OrderCard key={o.id} order={o} showProgress />)
        )}
      </div>
    </>
  );
}
