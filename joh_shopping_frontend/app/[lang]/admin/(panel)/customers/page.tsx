"use client";

import { Ban, Eye, UserCheck } from "lucide-react";
import { toast } from "sonner";
import type { Customer } from "@/types";
import { Avatar, Badge } from "@/components/ui/primitives";
import { AdminPageHeader, RequirePermission } from "@/components/admin/admin-shell";
import { DataTable, useTableState, type Column } from "@/components/admin/data-table";
import { useAdminDelete, useAdminList, useAdminPatch } from "@/lib/api/hooks";
import { useShop } from "@/lib/data/shop-context";
import { useLocalizedRouter, useT } from "@/lib/i18n/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { formatDate, formatTZS } from "@/lib/utils";

export default function AdminCustomersPage() {
  const { t, locale } = useT();
  const c = t.admin.customers;
  const cm = t.admin.common;
  const router = useLocalizedRouter();
  const state = useTableState({ sort: "-totalSpent" });
  const { data, isLoading } = useAdminList("customers", state.params);
  const patch = useAdminPatch("customers");
  const del = useAdminDelete("customers");
  const { regions: tzRegions } = useShop();

  const setBlocked = (r: Customer, blocked: boolean) => {
    patch.mutate(
      { id: r.id, patch: { status: blocked ? "blocked" : "active" } },
      {
        onSuccess: () => toast.success(blocked ? c.blockedToast : c.unblockedToast),
        onError: (err) => toast.error(apiErrorMessage(err, t)),
      },
    );
  };

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: cm.name,
      sort: "name",
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.name} />
          <div>
            <p className="font-medium">{r.name}</p>
            <p className="text-xs text-muted-foreground">{r.email}</p>
          </div>
        </div>
      ),
      csv: (r) => r.name,
    },
    { key: "phone", header: cm.phone, cell: (r) => r.phone, csv: (r) => r.phone },
    { key: "region", header: cm.region, sort: "region", cell: (r) => r.region, csv: (r) => r.region },
    { key: "orders", header: c.orders, sort: "ordersCount", cell: (r) => r.ordersCount, csv: (r) => r.ordersCount },
    { key: "spent", header: c.spent, sort: "totalSpent", cell: (r) => <span className="font-medium tabular-nums">{formatTZS(r.totalSpent)}</span>, csv: (r) => r.totalSpent },
    { key: "last", header: c.lastOrder, sort: "lastOrderAt", cell: (r) => (r.lastOrderAt ? formatDate(r.lastOrderAt, locale) : "—") },
    { key: "status", header: cm.status, cell: (r) => (r.status === "blocked" ? <Badge variant="danger">{c.blocked}</Badge> : <Badge variant="success">{cm.active}</Badge>), csv: (r) => r.status },
  ];

  return (
    <RequirePermission perm="customers.manage">
      <AdminPageHeader title={c.title} subtitle={c.subtitle} />
      <DataTable
        data={data}
        loading={isLoading}
        columns={columns}
        state={state}
        exportName="customers"
        onRowClick={(r) => router.push(`/admin/customers/${r.id}`)}
        onDelete={(ids) => del.mutateAsync(ids)}
        filters={[
          { key: "region", label: cm.region, options: tzRegions.map((r) => ({ value: r, label: r })) },
          { key: "status", label: cm.status, options: [{ value: "active", label: cm.active }, { value: "blocked", label: c.blocked }] },
        ]}
        actions={[
          { label: c.profile, icon: <Eye />, onClick: (r) => router.push(`/admin/customers/${r.id}`) },
          { label: c.block, icon: <Ban />, destructive: true, hidden: (r) => r.status === "blocked", onClick: (r) => setBlocked(r, true) },
          { label: c.unblock, icon: <UserCheck />, hidden: (r) => r.status !== "blocked", onClick: (r) => setBlocked(r, false) },
        ]}
      />
    </RequirePermission>
  );
}
