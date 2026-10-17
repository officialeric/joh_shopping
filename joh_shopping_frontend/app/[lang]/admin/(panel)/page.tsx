"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, MessageSquare, RotateCcw, ShoppingCart, Star, Users, Wallet, Receipt } from "lucide-react";
import { useState } from "react";
import { PaymentMark } from "@/components/brand/payment-logos";
import { Link } from "@/components/ui/link";
import { NativeSelect } from "@/components/ui/form-controls";
import { Skeleton, Tabs, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { OrderStatusBadge } from "@/components/shop/order-timeline";
import { AdminPageHeader, RequirePermission, useAdmin } from "@/components/admin/admin-shell";
import { BarList, TrendChart } from "@/components/admin/charts";
import { Panel, ProductThumb, StatCard } from "@/components/admin/widgets";
import { dashboardStats } from "@/lib/api/analytics";
import { useT } from "@/lib/i18n/client";
import { fmt, formatDate, formatTZS } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { t, locale } = useT();
  const d = t.admin.dashboard;
  const { admin } = useAdmin();
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue");
  const { data } = useQuery({ queryKey: ["admin", "dashboard", days], queryFn: () => dashboardStats(days) });

  const periods = [
    { v: 7, label: t.admin.common.last7 },
    { v: 30, label: t.admin.common.last30 },
    { v: 90, label: t.admin.common.last90 },
  ];

  return (
    <RequirePermission perm="dashboard.view">
      <AdminPageHeader
        title={fmt(d.greeting, { name: admin.name.split(" ")[0] ?? "" })}
        subtitle={d.subtitle}
        actions={
          <NativeSelect value={String(days)} onChange={(e) => setDays(Number(e.target.value))} className="h-10 w-48" aria-label={t.admin.reports.period}>
            {periods.map((p) => (
              <option key={p.v} value={p.v}>
                {p.label}
              </option>
            ))}
          </NativeSelect>
        }
      />

      {!data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard tone="brand" label={d.revenue} value={formatTZS(data.revenue.value, { compact: true })} icon={Wallet} delta={data.revenue.delta} hint={d.vsPrev} />
            <StatCard label={d.orders} value={data.orders.value} icon={ShoppingCart} delta={data.orders.delta} hint={d.vsPrev} />
            <StatCard label={d.aov} value={formatTZS(data.aov.value, { compact: true })} icon={Receipt} delta={data.aov.delta} hint={d.vsPrev} />
            <StatCard label={d.customers} value={data.customers.value} icon={Users} delta={data.customers.delta} hint={d.vsPrev} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
            <Panel
              title={d.salesOverview}
              action={
                <Tabs value={metric} onValueChange={(v) => setMetric(v as "revenue" | "orders")}>
                  <TabsList className="h-9">
                    <TabsTrigger value="revenue" className="h-7 text-xs">
                      {d.revenueSeries}
                    </TabsTrigger>
                    <TabsTrigger value="orders" className="h-7 text-xs">
                      {d.ordersSeries}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              }
            >
              <TrendChart
                label={metric === "revenue" ? d.revenueSeries : d.ordersSeries}
                data={data.series.map((p) => ({ date: p.date, value: metric === "revenue" ? p.revenue : p.orders }))}
                kind={metric === "revenue" ? "area" : "column"}
                money={metric === "revenue"}
              />
            </Panel>
            <Panel title={d.needsAttention}>
              <ul className="space-y-2">
                {[
                  { icon: ShoppingCart, label: d.pendingOrders, n: data.attention.pendingOrders, href: "/admin/orders" },
                  { icon: RotateCcw, label: d.pendingReturns, n: data.attention.pendingReturns, href: "/admin/returns" },
                  { icon: Star, label: d.pendingReviews, n: data.attention.pendingReviews, href: "/admin/reviews" },
                  { icon: MessageSquare, label: d.unreadMessages, n: data.attention.unreadMessages, href: "/admin/messages" },
                ].map((a) => (
                  <li key={a.href}>
                    <Link href={a.href} className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:border-primary/40 hover:bg-primary-soft/30">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                        <a.icon className="size-4" />
                      </span>
                      <span className="flex-1 text-sm">{a.label}</span>
                      <span className="font-display text-lg font-semibold tabular-nums">{a.n}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title={d.byPayment}>
              <BarList
                items={data.byPayment.map(([m, v]) => ({
                  key: m,
                  label: m === "card" ? t.common.payment.card : t.common.payment[m],
                  value: v,
                  detail: formatTZS(v),
                  adornment: <PaymentMark method={m} className="h-6 min-w-12" />,
                }))}
              />
            </Panel>
            <Panel title={d.byCategory}>
              <BarList items={data.byCategory.map((c) => ({ key: c.id, label: c.name?.[locale] ?? c.id, value: c.value, detail: formatTZS(c.value) }))} />
            </Panel>
            <Panel title={d.byRegion}>
              <BarList items={data.byRegion.map(([r, n]) => ({ key: r, label: r === "Pickup" ? t.admin.orders.pickup : r, value: n }))} format={(v) => String(v)} />
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <Panel
              title={d.recentOrders}
              action={
                <Link href="/admin/orders" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  {t.common.actions.viewAll}
                  <ArrowRight className="size-4" />
                </Link>
              }
            >
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    {data.recentOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-muted/40">
                        <td className="px-2 py-3">
                          <Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-primary">
                            {o.number}
                          </Link>
                          <p className="text-xs text-muted-foreground">{formatDate(o.createdAt, locale)}</p>
                        </td>
                        <td className="px-2 py-3">{o.customerName}</td>
                        <td className="px-2 py-3">
                          <PaymentMark method={o.paymentMethod} className="h-5 min-w-10 text-[8px]" />
                        </td>
                        <td className="px-2 py-3">
                          <OrderStatusBadge status={o.status} />
                        </td>
                        <td className="px-2 py-3 text-right font-medium tabular-nums">{formatTZS(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <div className="space-y-6">
              <Panel title={d.topProducts}>
                <ul className="space-y-3">
                  {data.topProducts.map((p, i) => (
                    <li key={p.product.id} className="flex items-center gap-3">
                      <span className="w-4 text-xs font-semibold text-muted-foreground">{i + 1}</span>
                      <ProductThumb productId={p.product.id} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.product.name}</p>
                        <p className="text-xs text-muted-foreground">{fmt(d.unitsSold, { n: p.qty })}</p>
                      </div>
                      <span className="text-sm font-medium tabular-nums">{formatTZS(p.revenue, { compact: true })}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel
                title={
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-warning" />
                    {d.lowStock}
                  </span>
                }
                action={
                  <Link href="/admin/inventory" className="text-sm font-medium text-primary hover:underline">
                    {t.common.actions.viewAll}
                  </Link>
                }
              >
                {data.lowStock.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{d.lowStockEmpty}</p>
                ) : (
                  <ul className="space-y-3">
                    {data.lowStock.map(({ product, variant }) => (
                      <li key={variant.id} className="flex items-center gap-3">
                        <ProductThumb productId={product.id} color={variant.color} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{product.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{variant.sku}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${variant.stock === 0 ? "bg-primary-soft text-primary" : "bg-warning-soft text-warning"}`}>
                          {variant.stock === 0 ? t.admin.products.outOfStock : fmt(d.left, { n: variant.stock })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        </div>
      )}
    </RequirePermission>
  );
}
