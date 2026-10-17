"use client";

import { Eye } from "lucide-react";
import type { Order } from "@/types";
import { OrderStatusBadge } from "@/components/shop/order-timeline";
import { AdminPageHeader, RequirePermission } from "@/components/admin/admin-shell";
import { DataTable, useTableState, type Column } from "@/components/admin/data-table";
import { MethodCell, ORDER_STATUSES, PaymentStatusBadge } from "@/components/admin/widgets";
import { useAdminDelete, useAdminList } from "@/lib/api/hooks";
import { useLocalizedRouter, useT } from "@/lib/i18n/client";
import { fmt, formatDateTime, formatTZS } from "@/lib/utils";

export default function AdminOrdersPage() {
  const { t, locale } = useT();
  const o = t.admin.orders;
  const router = useLocalizedRouter();
  const state = useTableState({ sort: "-createdAt" });
  const { data, isLoading } = useAdminList("orders", state.params);
  const del = useAdminDelete("orders");

  const columns: Column<Order>[] = [
    {
      key: "number",
      header: o.number,
      sort: "number",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.number}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(r.createdAt, locale)}</p>
        </div>
      ),
      csv: (r) => r.number,
    },
    {
      key: "customer",
      header: t.admin.common.customer,
      sort: "customerName",
      cell: (r) => (
        <div>
          <p>{r.customerName}</p>
          <p className="text-xs text-muted-foreground">{r.customerPhone}</p>
        </div>
      ),
      csv: (r) => r.customerName,
    },
    { key: "items", header: o.items, cell: (r) => fmt(t.account.orders.items, { n: r.items.reduce((n, i) => n + i.qty, 0) }), csv: (r) => r.items.length },
    { key: "method", header: o.payment, cell: (r) => <MethodCell method={r.paymentMethod} />, csv: (r) => r.paymentMethod },
    { key: "payment", header: t.admin.payments.title, cell: (r) => <PaymentStatusBadge status={r.paymentStatus} />, csv: (r) => r.paymentStatus },
    { key: "status", header: t.admin.common.status, sort: "status", cell: (r) => <OrderStatusBadge status={r.status} />, csv: (r) => r.status },
    { key: "delivery", header: o.delivery, cell: (r) => <span className="text-xs">{t.common.delivery[r.deliveryMethod]}</span>, csv: (r) => r.deliveryMethod },
    {
      key: "total",
      header: t.admin.common.total,
      sort: "total",
      className: "text-right",
      cell: (r) => <span className="font-medium tabular-nums">{formatTZS(r.total)}</span>,
      csv: (r) => r.total,
    },
  ];

  return (
    <RequirePermission perm="orders.view">
      <AdminPageHeader title={o.title} subtitle={o.subtitle} />
      <DataTable
        data={data}
        loading={isLoading}
        columns={columns}
        state={state}
        exportName="orders"
        onRowClick={(r) => router.push(`/admin/orders/${r.id}`)}
        onDelete={(ids) => del.mutateAsync(ids)}
        filters={[
          { key: "status", label: o.filterStatus, options: ORDER_STATUSES.map((s) => ({ value: s, label: t.common.orderStatus[s] })) },
          {
            key: "paymentStatus",
            label: o.filterPayment,
            options: (["paid", "pending", "failed", "refunded", "partially_refunded"] as const).map((s) => ({ value: s, label: t.common.paymentStatus[s] })),
          },
          { key: "deliveryMethod", label: o.delivery, options: (["standard", "express", "pickup"] as const).map((d) => ({ value: d, label: t.common.delivery[d] })) },
        ]}
        actions={[
          { label: t.admin.common.view, icon: <Eye />, onClick: (r) => router.push(`/admin/orders/${r.id}`) },
          
        ]}
      />
    </RequirePermission>
  );
}
