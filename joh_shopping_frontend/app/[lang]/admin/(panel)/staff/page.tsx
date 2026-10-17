"use client";

import { Send } from "lucide-react";
import { toast } from "sonner";
import type { Staff } from "@/types";
import { Avatar, Badge } from "@/components/ui/primitives";
import { CrudPage } from "@/components/admin/crud-page";
import { resendStaffInvite } from "@/lib/api/admin";
import { apiErrorMessage } from "@/lib/api/errors";
import { useAdminAll } from "@/lib/api/hooks";
import { useT } from "@/lib/i18n/client";
import { formatDateTime } from "@/lib/utils";

export default function AdminStaffPage() {
  const { t, locale } = useT();
  const s = t.admin.staff;
  const cm = t.admin.common;
  const { data: roles = [] } = useAdminAll("roles");
  const variant = (st: Staff["status"]) => (st === "active" ? "success" : st === "invited" ? "info" : "danger");

  return (
    <CrudPage
      collection="staff"
      perm="staff.manage"
      title={s.title}
      subtitle={s.subtitle}
      newLabel={s.new}
      editLabel={s.edit}
      exportName="staff"
      blank={() => ({ name: "", email: "", phone: "", roleId: "role-sales", status: "invited" as const, createdAt: new Date().toISOString() })}
      filters={[
        { key: "roleId", label: s.role, options: roles.map((r) => ({ value: r.id, label: r.name })) },
        { key: "status", label: cm.status, options: (Object.keys(s.status) as Staff["status"][]).map((k) => ({ value: k, label: s.status[k] })) },
      ]}
      fields={[
        { name: "name", label: cm.name, required: true, span: 2 },
        { name: "email", label: cm.email, type: "email", required: true },
        { name: "phone", label: cm.phone, type: "tel" },
        { name: "roleId", label: s.role, type: "select", options: roles.map((r) => ({ value: r.id, label: r.name })) },
        { name: "status", label: cm.status, type: "select", options: (Object.keys(s.status) as Staff["status"][]).map((k) => ({ value: k, label: s.status[k] })) },
      ]}
      actions={[
        {
          label: s.invite,
          icon: <Send />,
          hidden: (r) => r.status !== "invited",
          onClick: (r) =>
            resendStaffInvite(r.id).then(
              () => toast.success(s.invited),
              (err) => toast.error(apiErrorMessage(err, t)),
            ),
        },
      ]}
      columns={[
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
        { key: "role", header: s.role, cell: (r) => <Badge variant="outline">{roles.find((x) => x.id === r.roleId)?.name}</Badge>, csv: (r) => r.roleId },
        { key: "last", header: s.lastActive, sort: "lastActiveAt", cell: (r) => (r.lastActiveAt ? formatDateTime(r.lastActiveAt, locale) : "—") },
        { key: "status", header: cm.status, cell: (r) => <Badge variant={variant(r.status)}>{s.status[r.status]}</Badge>, csv: (r) => r.status },
      ]}
    />
  );
}
