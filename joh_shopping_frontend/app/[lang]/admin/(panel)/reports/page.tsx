"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, Percent, ReceiptText, Truck, Undo2, Wallet } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/form-controls";
import { Skeleton } from "@/components/ui/primitives";
import { AdminPageHeader, RequirePermission } from "@/components/admin/admin-shell";
import { BarList, ShareBar, TrendChart } from "@/components/admin/charts";
import { Panel, ProductThumb, StatCard } from "@/components/admin/widgets";
import { salesReport } from "@/lib/api/analytics";
import { useT } from "@/lib/i18n/client";
import { formatTZS } from "@/lib/utils";

export default function AdminReportsPage() {
  const { t, locale } = useT();
  const r = t.admin.reports;
  const [days, setDays] = useState(30);
  const { data } = useQuery({ queryKey: ["admin", "reports", days], queryFn: () => salesReport(days) });

  const exportCsv = () => {
    if (!data) return;
    const lines = [
      ["date", "orders", "revenue_tzs"].join(","),
      ...data.series.map((p) => [p.date.slice(0, 10), p.orders, p.revenue].join(",")),
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `joh-sales-${days}d.csv`;
    a.click();
  };

  return (
    <RequirePermission perm="reports.view">
      <AdminPageHeader
        title={r.title}
        subtitle={r.subtitle}
        actions={
          <>
            <NativeSelect value={String(days)} onChange={(e) => setDays(Number(e.target.value))} className="h-10 w-48" aria-label={r.period}>
              <option value={7}>{t.admin.common.last7}</option>
              <option value={30}>{t.admin.common.last30}</option>
              <option value={90}>{t.admin.common.last90}</option>
            </NativeSelect>
            <Button variant="outline" onClick={exportCsv} disabled={!data}>
              <Download />
              {t.admin.table.exportCsv}
            </Button>
          </>
        }
      />
      {!data ? (
        <Skeleton className="h-[600px]" />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard tone="brand" label={r.netSales} value={formatTZS(data.net, { compact: true })} icon={Wallet} />
            <StatCard label={r.grossSales} value={formatTZS(data.gross, { compact: true })} icon={ReceiptText} />
            <StatCard label={r.discounts} value={formatTZS(data.discounts, { compact: true })} icon={Percent} />
            <StatCard label={r.refunds} value={formatTZS(data.refunds, { compact: true })} icon={Undo2} />
            <StatCard label={r.shippingFees} value={formatTZS(data.shipping, { compact: true })} icon={Truck} />
          </div>
          <Panel title={r.salesByDay}>
            <TrendChart label={r.salesByDay} data={data.series.map((p) => ({ date: p.date, value: p.revenue }))} kind="column" />
          </Panel>
          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title={r.salesByCategory}>
              <BarList items={data.byCategory.map((c) => ({ key: c.id, label: c.name?.[locale] ?? c.id, value: c.revenue, detail: `${c.units} ${r.units.toLowerCase()}` }))} />
            </Panel>
            <Panel title={r.salesByBrand}>
              <BarList items={data.byBrand.slice(0, 8).map((b) => ({ key: b.name, label: b.name, value: b.revenue, detail: `${b.units} ${r.units.toLowerCase()}` }))} />
            </Panel>
            <Panel title={r.conditionSplit}>
              <ShareBar
                parts={[
                  { label: t.common.product.new, value: data.condition.new, color: "1" },
                  { label: t.common.product.used, value: data.condition.used, color: "2" },
                ]}
              />
            </Panel>
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title={r.topProducts}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">{t.admin.common.product}</th>
                    <th className="pb-2 text-right font-medium">{r.units}</th>
                    <th className="pb-2 text-right font-medium">{r.revenue}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.topProducts.map((p) => (
                    <tr key={p.product.id}>
                      <td className="py-2.5">
                        <div className="flex items-center gap-3">
                          <ProductThumb productId={p.product.id} className="size-9" />
                          <span className="font-medium">{p.product.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{p.units}</td>
                      <td className="py-2.5 text-right font-medium tabular-nums">{formatTZS(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
            <Panel title={r.topCustomers}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">{t.admin.common.customer}</th>
                    <th className="pb-2 text-right font-medium">{t.admin.customers.orders}</th>
                    <th className="pb-2 text-right font-medium">{r.revenue}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.topCustomers.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5 font-medium">{c.name}</td>
                      <td className="py-2.5 text-right tabular-nums">{c.orders}</td>
                      <td className="py-2.5 text-right font-medium tabular-nums">{formatTZS(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>
        </div>
      )}
    </RequirePermission>
  );
}
