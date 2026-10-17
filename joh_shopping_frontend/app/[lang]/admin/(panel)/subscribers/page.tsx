"use client";

import { MailCheck, MailX } from "lucide-react";
import type { Subscriber } from "@/types";
import { Badge } from "@/components/ui/primitives";
import { AdminPageHeader, RequirePermission } from "@/components/admin/admin-shell";
import { DataTable, useTableState, type Column } from "@/components/admin/data-table";
import { useAdminDelete, useAdminList, useAdminPatch } from "@/lib/api/hooks";
import { useT } from "@/lib/i18n/client";
import { formatDate } from "@/lib/utils";

export default function AdminSubscribersPage() {
  const { t, locale } = useT();
  const s = t.admin.subscribers;
  const cm = t.admin.common;
  const state = useTableState({ sort: "-createdAt" });
  const { data, isLoading } = useAdminList("subscribers", state.params);
  const patch = useAdminPatch("subscribers");
  const del = useAdminDelete("subscribers");

  const columns: Column<Subscriber>[] = [
    { key: "email", header: cm.email, sort: "email", cell: (r) => <span className="font-medium">{r.email}</span>, csv: (r) => r.email },
    { key: "source", header: s.source, cell: (r) => <Badge variant="outline">{s.sources[r.source]}</Badge>, csv: (r) => r.source },
    { key: "date", header: cm.date, sort: "createdAt", cell: (r) => formatDate(r.createdAt, locale), csv: (r) => r.createdAt },
    { key: "status", header: cm.status, cell: (r) => <Badge variant={r.active ? "success" : "muted"}>{r.active ? cm.active : cm.inactive}</Badge>, csv: (r) => String(r.active) },
  ];

  return (
    <RequirePermission perm="messages.manage">
      <AdminPageHeader title={s.title} subtitle={s.subtitle} />
      <DataTable
        data={data}
        loading={isLoading}
        columns={columns}
        state={state}
        exportName="subscribers"
        onDelete={(ids) => del.mutateAsync(ids)}
        filters={[{ key: "source", label: s.source, options: (Object.keys(s.sources) as Subscriber["source"][]).map((k) => ({ value: k, label: s.sources[k] })) }]}
        actions={[
          { label: s.unsubscribe, icon: <MailX />, hidden: (r) => !r.active, onClick: (r) => patch.mutate({ id: r.id, patch: { active: false } }) },
          { label: s.resubscribe, icon: <MailCheck />, hidden: (r) => r.active, onClick: (r) => patch.mutate({ id: r.id, patch: { active: true } }) },
        ]}
      />
    </RequirePermission>
  );
}
