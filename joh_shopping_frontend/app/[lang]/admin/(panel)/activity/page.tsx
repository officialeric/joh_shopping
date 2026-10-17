"use client";

import type { ActivityLog } from "@/types";
import { Avatar } from "@/components/ui/primitives";
import { AdminPageHeader, RequirePermission } from "@/components/admin/admin-shell";
import { DataTable, useTableState, type Column } from "@/components/admin/data-table";
import { useQuery } from "@tanstack/react-query";
import { useAdminList } from "@/lib/api/hooks";
import { apiData } from "@/lib/api/core";
import { useT } from "@/lib/i18n/client";
import { formatDateTime } from "@/lib/utils";

export default function AdminActivityPage() {
  const { t, locale } = useT();
  const a = t.admin.activity;
  const state = useTableState({ sort: "-createdAt", perPage: 25 });
  const { data, isLoading } = useAdminList("activity", state.params);
  const { data: actors = [] } = useQuery({ queryKey: ["admin", "activity", "actors"], queryFn: () => apiData<string[]>("/admin/activity-actors") });

  const columns: Column<ActivityLog>[] = [
    {
      key: "actor",
      header: a.actor,
      sort: "actor",
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={r.actor} className="size-7 text-[10px]" />
          <span className="font-medium">{r.actor}</span>
        </div>
      ),
      csv: (r) => r.actor,
    },
    { key: "action", header: a.action, cell: (r) => <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">{r.action}</span>, csv: (r) => r.action },
    { key: "subject", header: a.subject, cell: (r) => <span className="text-muted-foreground">{r.subject}</span>, csv: (r) => r.subject },
    { key: "ip", header: a.ip, cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.ip}</span>, csv: (r) => r.ip },
    { key: "date", header: t.admin.common.date, sort: "createdAt", cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.createdAt, locale)}</span>, csv: (r) => r.createdAt },
  ];

  return (
    <RequirePermission perm="activity.view">
      <AdminPageHeader title={a.title} subtitle={a.subtitle} />
      <DataTable
        data={data}
        loading={isLoading}
        columns={columns}
        state={state}
        exportName="activity-log"
        filters={[{ key: "actor", label: a.actor, options: actors.map((x) => ({ value: x, label: x })) }]}
      />
    </RequirePermission>
  );
}
