"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { Skeleton } from "@/components/ui/primitives";
import { AdminPageHeader, RequirePermission } from "@/components/admin/admin-shell";
import { Panel } from "@/components/admin/widgets";
import { useAdminAll, useAdminDelete, useAdminSave } from "@/lib/api/hooks";
import type { AttributeValue } from "@/types";
import { useT } from "@/lib/i18n/client";
import { fmt } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api/errors";

export default function AdminAttributesPage() {
  const { t, locale } = useT();
  const a = t.admin.attributes;
  const { data } = useAdminAll("attributes");
  const save = useAdminSave("attributes");
  const { data: products = [] } = useAdminAll("products");
  const del = useAdminDelete("attributes");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [colorDraft, setColorDraft] = useState({ sw: "", en: "", hex: "#9ca3af" });

  if (!data) return <Skeleton className="h-96" />;
  const usage = (x: AttributeValue) =>
    products.filter((p) =>
      x.type === "color"
        ? p.colors.some((c) => c.name.en === x.value)
        : x.type === "storage"
          ? p.storages.includes(x.value)
          : x.type === "ram"
            ? p.rams.includes(x.value)
            : p.grade === x.value,
    ).length;

  const add = async (type: AttributeValue["type"]) => {
    const value = drafts[type]?.trim().toUpperCase();
    if (!value) return;
    try {
      await save.mutateAsync({ type, value });
      setDrafts((d) => ({ ...d, [type]: "" }));
      toast.success(t.admin.common.saved);
    } catch (err) {
      toast.error(apiErrorMessage(err, t));
    }
  };

  const chips = (type: AttributeValue["type"]) => (
    <div className="flex flex-wrap gap-2">
      {data
        .filter((x) => x.type === type)
        .map((x) => (
          <span key={x.id} className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 py-1 pr-1.5 pl-3 text-sm" title={fmt(a.usedIn, { n: usage(x) })}>
            {x.value}
            <span className="text-[10px] text-muted-foreground">{usage(x)}</span>
            <button onClick={() => del.mutate([x.id], { onError: (err) => toast.error(apiErrorMessage(err, t)) })} className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-destructive" aria-label={t.admin.common.delete}>
              <X className="size-3.5" />
            </button>
          </span>
        ))}
    </div>
  );

  return (
    <RequirePermission perm="products.manage">
      <AdminPageHeader title={a.title} subtitle={a.subtitle} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={a.color} className="xl:row-span-3">
          <ul className="grid gap-2 sm:grid-cols-2">
            {data
              .filter((x) => x.type === "color")
              .map((x) => (
                <li key={x.id} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
                  <span className="size-8 shrink-0 rounded-lg border border-black/10" style={{ background: x.hex }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{x.label?.[locale] ?? x.value}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {x.hex} · {fmt(a.usedIn, { n: usage(x) })}
                    </p>
                  </div>
                  <button onClick={() => del.mutate([x.id], { onError: (err) => toast.error(apiErrorMessage(err, t)) })} className="rounded-full p-1 text-muted-foreground hover:text-destructive" aria-label={t.admin.common.delete}>
                    <X className="size-4" />
                  </button>
                </li>
              ))}
          </ul>
          <form
            className="mt-4 grid grid-cols-[44px_1fr_1fr_auto] gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!colorDraft.en.trim()) return;
              try {
                await save.mutateAsync({ type: "color", value: colorDraft.en, label: { sw: colorDraft.sw || colorDraft.en, en: colorDraft.en }, hex: colorDraft.hex });
                setColorDraft({ sw: "", en: "", hex: "#9ca3af" });
                toast.success(t.admin.common.saved);
              } catch (err) {
                toast.error(apiErrorMessage(err, t));
              }
            }}
          >
            <input type="color" value={colorDraft.hex} onChange={(e) => setColorDraft({ ...colorDraft, hex: e.target.value })} className="h-10 w-11 rounded-lg border border-input p-0.5" aria-label={a.hex} />
            <Input className="h-10" placeholder="SW" value={colorDraft.sw} onChange={(e) => setColorDraft({ ...colorDraft, sw: e.target.value })} />
            <Input className="h-10" placeholder="EN" value={colorDraft.en} onChange={(e) => setColorDraft({ ...colorDraft, en: e.target.value })} />
            <Button type="submit" size="icon" aria-label={a.add}>
              <Plus />
            </Button>
          </form>
        </Panel>
        {(["storage", "ram", "grade"] as const).map((type) => (
          <Panel key={type} title={a[type]}>
            {chips(type)}
            {type !== "grade" && (
              <form
                className="mt-4 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  add(type);
                }}
              >
                <Input className="h-10" placeholder={type === "storage" ? "2TB" : "24GB"} value={drafts[type] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [type]: e.target.value }))} />
                <Button type="submit" variant="outline">
                  <Plus />
                  {a.add}
                </Button>
              </form>
            )}
          </Panel>
        ))}
      </div>
    </RequirePermission>
  );
}
