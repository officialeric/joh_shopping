"use client";

import { CalendarClock, Pencil, Plus, Trash2, X, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { FlashSale } from "@/types";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Switch } from "@/components/ui/form-controls";
import { ConfirmDialog, Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/overlays";
import { Badge, Progress, Skeleton } from "@/components/ui/primitives";
import { AdminPageHeader, RequirePermission } from "@/components/admin/admin-shell";
import { ProductThumb } from "@/components/admin/widgets";
import { useAdminAll, useAdminDelete, useAdminSave } from "@/lib/api/hooks";
import { useT } from "@/lib/i18n/client";
import { formatDateTime, formatTZS } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api/errors";

function saleState(s: FlashSale) {
  const now = Date.now();
  if (new Date(s.endsAt).getTime() < now) return "ended" as const;
  if (new Date(s.startsAt).getTime() > now) return "scheduled" as const;
  return "live" as const;
}

export default function AdminFlashSalesPage() {
  const { t, locale } = useT();
  const f = t.admin.flashSales;
  const cm = t.admin.common;
  const { data } = useAdminAll("flashSales");
  const save = useAdminSave("flashSales");
  const del = useAdminDelete("flashSales");
  const [editing, setEditing] = useState<FlashSale | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const { data: products = [] } = useAdminAll("products");

  const blank = (): FlashSale => ({
    id: "",
    name: { sw: "", en: "" },
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    active: true,
    items: [],
  });

  return (
    <RequirePermission perm="promotions.manage">
      <AdminPageHeader
        title={f.title}
        subtitle={f.subtitle}
        actions={
          <Button onClick={() => setEditing(blank())}>
            <Plus />
            {f.new}
          </Button>
        }
      />
      {!data ? (
        <Skeleton className="h-80" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((sale) => {
            const st = saleState(sale);
            return (
              <article key={sale.id} className="overflow-hidden rounded-[20px] border border-border bg-card shadow-soft">
                <div className={`flex items-start justify-between gap-3 p-5 ${st === "live" ? "bg-brand-gradient text-white" : "bg-muted/50"}`}>
                  <div>
                    <p className="flex items-center gap-2 text-lg font-semibold">
                      <Zap className="size-5" />
                      {sale.name[locale]}
                    </p>
                    <p className={`mt-1 flex items-center gap-1.5 text-xs ${st === "live" ? "text-white/80" : "text-muted-foreground"}`}>
                      <CalendarClock className="size-3.5" />
                      {formatDateTime(sale.startsAt, locale)} → {formatDateTime(sale.endsAt, locale)}
                    </p>
                  </div>
                  <Badge variant={st === "live" ? "secondary" : st === "scheduled" ? "info" : "muted"}>{f[st]}</Badge>
                </div>
                <ul className="divide-y divide-border px-5">
                  {sale.items.map((it) => {
                    const p = products.find((x) => x.id === it.productId);
                    return (
                      <li key={it.productId} className="flex items-center gap-3 py-3">
                        <ProductThumb productId={it.productId} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-semibold text-primary">{formatTZS(it.salePrice)}</span> · <span className="line-through">{p && formatTZS(p.price)}</span>
                          </p>
                        </div>
                        <div className="w-24">
                          <p className="mb-1 text-right text-xs tabular-nums">
                            {it.sold}/{it.quantity}
                          </p>
                          <Progress value={(it.sold / it.quantity) * 100} className="h-1.5" />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex justify-end gap-2 border-t border-border p-3">
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setToDelete(sale.id)}>
                    <Trash2 />
                    {cm.delete}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(structuredClone(sale))}>
                    <Pencil />
                    {cm.edit}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? f.edit : f.new}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              className="grid gap-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editing.name.sw || !editing.name.en) return toast.error(cm.required);
                try {
                  await save.mutateAsync(editing.id ? editing : { ...editing, id: undefined });
                  setEditing(null);
                  toast.success(cm.saved);
                } catch (err) {
                  toast.error(apiErrorMessage(err, t));
                }
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={cm.nameSw} htmlFor="fs-sw">
                  <Input id="fs-sw" value={editing.name.sw} onChange={(e) => setEditing({ ...editing, name: { ...editing.name, sw: e.target.value } })} />
                </Field>
                <Field label={cm.nameEn} htmlFor="fs-en">
                  <Input id="fs-en" value={editing.name.en} onChange={(e) => setEditing({ ...editing, name: { ...editing.name, en: e.target.value } })} />
                </Field>
                <Field label={cm.from} htmlFor="fs-from">
                  <Input id="fs-from" type="datetime-local" value={editing.startsAt.slice(0, 16)} onChange={(e) => setEditing({ ...editing, startsAt: new Date(e.target.value).toISOString() })} />
                </Field>
                <Field label={cm.to} htmlFor="fs-to">
                  <Input id="fs-to" type="datetime-local" value={editing.endsAt.slice(0, 16)} onChange={(e) => setEditing({ ...editing, endsAt: new Date(e.target.value).toISOString() })} />
                </Field>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">{f.items}</p>
                {editing.items.map((it, i) => (
                  <div key={i} className="grid grid-cols-[1fr_130px_90px_auto] items-end gap-2">
                    <NativeSelect
                      value={it.productId}
                      onChange={(e) => setEditing({ ...editing, items: editing.items.map((x, j) => (j === i ? { ...x, productId: e.target.value } : x)) })}
                      aria-label={cm.product}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {formatTZS(p.price, { compact: true })}
                        </option>
                      ))}
                    </NativeSelect>
                    <Input
                      type="number"
                      placeholder={f.salePrice}
                      value={it.salePrice}
                      onChange={(e) => setEditing({ ...editing, items: editing.items.map((x, j) => (j === i ? { ...x, salePrice: Number(e.target.value) } : x)) })}
                      aria-label={f.salePrice}
                    />
                    <Input
                      type="number"
                      placeholder={f.quantity}
                      value={it.quantity}
                      onChange={(e) => setEditing({ ...editing, items: editing.items.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) } : x)) })}
                      aria-label={f.quantity}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setEditing({ ...editing, items: editing.items.filter((_, j) => j !== i) })} aria-label={cm.delete}>
                      <X />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const p = products[0]!;
                    setEditing({ ...editing, items: [...editing.items, { productId: p.id, salePrice: Math.round(p.price * 0.9), quantity: 20, sold: 0 }] });
                  }}
                >
                  <Plus />
                  {f.addItem}
                </Button>
              </div>
              <label className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm font-medium">
                {cm.active}
                <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  {cm.cancel}
                </Button>
                <Button type="submit" loading={save.isPending}>
                  {cm.save}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={cm.confirmDelete}
        description={cm.confirmDeleteDesc}
        confirmLabel={cm.delete}
        cancelLabel={cm.cancel}
        onConfirm={async () => {
          try {
            await del.mutateAsync([toDelete!]);
            toast.success(cm.deleted);
          } catch (err) {
            toast.error(apiErrorMessage(err, t));
          }
        }}
      />
    </RequirePermission>
  );
}
