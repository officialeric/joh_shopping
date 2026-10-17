"use client";

import { Lock, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Permission, Role } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/form-controls";
import { Badge, Skeleton } from "@/components/ui/primitives";
import { AdminPageHeader, RequirePermission } from "@/components/admin/admin-shell";
import { useAdminAll, useAdminDelete, useAdminSave } from "@/lib/api/hooks";
import { useT } from "@/lib/i18n/client";
import { cn, fmt } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api/errors";

const GROUPS: { key: "overview" | "catalog" | "sales" | "customers" | "marketing" | "operations" | "admin"; perms: Permission[] }[] = [
  { key: "overview", perms: ["dashboard.view", "reports.view"] },
  { key: "catalog", perms: ["products.manage", "categories.manage", "inventory.manage"] },
  { key: "sales", perms: ["orders.view", "orders.manage", "payments.view", "payments.refund", "returns.manage"] },
  { key: "customers", perms: ["customers.manage", "reviews.manage", "messages.manage"] },
  { key: "marketing", perms: ["promotions.manage", "content.manage"] },
  { key: "operations", perms: ["shipping.manage"] },
  { key: "admin", perms: ["staff.manage", "roles.manage", "activity.view", "settings.manage"] },
];

export default function AdminRolesPage() {
  const { t, locale } = useT();
  const r = t.admin.roles;
  const { data: roles } = useAdminAll("roles");
  const save = useAdminSave("roles");
  const del = useAdminDelete("roles");
  const [selectedId, setSelectedId] = useState("role-manager");
  const [draft, setDraft] = useState<Role | null>(null);

  if (!roles) return <Skeleton className="h-[600px]" />;
  const selected = draft ?? roles.find((x) => x.id === selectedId) ?? roles[0]!;
  const members = (id: string) => roles.find((x) => x.id === id)?.staffCount ?? 0;
  const edit = (patch: Partial<Role>) => setDraft({ ...selected, ...patch });
  const toggle = (p: Permission) => edit({ permissions: selected.permissions.includes(p) ? selected.permissions.filter((x) => x !== p) : [...selected.permissions, p] });

  return (
    <RequirePermission perm="roles.manage">
      <AdminPageHeader
        title={r.title}
        subtitle={r.subtitle}
        actions={
          <Button
            onClick={() => {
              setDraft({ id: "", name: "", description: { sw: "", en: "" }, permissions: ["dashboard.view"], system: false });
            }}
          >
            <Plus />
            {r.new}
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <ul className="space-y-2">
          {roles.map((role) => (
            <li key={role.id}>
              <button
                onClick={() => {
                  setSelectedId(role.id);
                  setDraft(null);
                }}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition",
                  selected.id === role.id && !(draft && !draft.id) ? "border-primary bg-primary-soft/40 ring-1 ring-primary" : "border-border bg-card hover:border-foreground/20",
                )}
              >
                <p className="flex items-center gap-2 font-semibold">
                  {role.system ? <Lock className="size-4 text-muted-foreground" /> : <ShieldCheck className="size-4 text-primary" />}
                  {role.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{role.description[locale]}</p>
                <p className="mt-2 text-xs">
                  {fmt(r.members, { n: members(role.id) })} · {role.permissions.length} {r.permissions.toLowerCase()}
                </p>
              </button>
            </li>
          ))}
        </ul>

        <section className="rounded-[20px] border border-border bg-card p-6 shadow-soft">
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <Input value={selected.name} placeholder={t.admin.common.name} disabled={selected.system} onChange={(e) => edit({ name: e.target.value })} aria-label={t.admin.common.name} />
            <Input
              value={selected.description[locale]}
              placeholder={t.admin.common.description}
              disabled={selected.system}
              onChange={(e) => edit({ description: { ...selected.description, [locale]: e.target.value } })}
              aria-label={t.admin.common.description}
            />
          </div>
          {selected.system && (
            <p className="mb-4 flex items-center gap-2 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
              <Lock className="size-4" />
              {r.system}
            </p>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            {GROUPS.map((g) => {
              const all = g.perms.every((p) => selected.permissions.includes(p));
              const some = g.perms.some((p) => selected.permissions.includes(p));
              return (
                <div key={g.key} className="rounded-2xl border border-border p-4">
                  <label className="mb-3 flex items-center gap-2.5 font-semibold">
                    <Checkbox
                      checked={all ? true : some ? "indeterminate" : false}
                      disabled={selected.system}
                      onCheckedChange={(c) =>
                        edit({ permissions: c ? [...new Set([...selected.permissions, ...g.perms])] : selected.permissions.filter((p) => !g.perms.includes(p)) })
                      }
                    />
                    {r.groups[g.key]}
                  </label>
                  <div className="space-y-2 pl-1">
                    {g.perms.map((p) => (
                      <label key={p} className="flex items-center gap-2.5 text-sm">
                        <Checkbox checked={selected.permissions.includes(p)} disabled={selected.system} onCheckedChange={() => toggle(p)} />
                        <span>{r.perm[p]}</span>
                        <code className="ml-auto text-[10px] text-muted-foreground">{p}</code>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {!selected.system && (
            <div className="mt-6 flex justify-between gap-2 border-t border-border pt-5">
              {selected.id && members(selected.id) === 0 ? (
                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={async () => {
                    try {
                      await del.mutateAsync([selected.id]);
                      setSelectedId("role-manager");
                      setDraft(null);
                      toast.success(t.admin.common.deleted);
                    } catch (err) {
                      toast.error(apiErrorMessage(err, t));
                    }
                  }}
                >
                  <Trash2 />
                  {t.admin.common.delete}
                </Button>
              ) : (
                <span>{selected.id && <Badge variant="muted">{fmt(r.members, { n: members(selected.id) })}</Badge>}</span>
              )}
              <Button
                disabled={!draft || !selected.name.trim()}
                loading={save.isPending}
                onClick={async () => {
                  try {
                    const saved = await save.mutateAsync(selected.id ? selected : { ...selected, id: undefined });
                    setSelectedId(saved.id);
                    setDraft(null);
                    toast.success(t.admin.common.saved);
                  } catch (err) {
                    toast.error(apiErrorMessage(err, t));
                  }
                }}
              >
                <Save />
                {t.admin.common.save}
              </Button>
            </div>
          )}
        </section>
      </div>
    </RequirePermission>
  );
}
