"use client";

import { useQuery } from "@tanstack/react-query";
import { Plug, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { PaymentMethod, StoreSettings } from "@/types";
import { PaymentMark } from "@/components/brand/payment-logos";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Switch } from "@/components/ui/form-controls";
import { Skeleton } from "@/components/ui/primitives";
import { AdminPageHeader, RequirePermission } from "@/components/admin/admin-shell";
import { Panel } from "@/components/admin/widgets";
import { getSettings, saveSettings } from "@/lib/api/admin";
import { apiErrorMessage } from "@/lib/api/errors";
import { useInvalidateAdmin } from "@/lib/api/hooks";
import { localeNames } from "@/lib/i18n/config";
import { useT } from "@/lib/i18n/client";

const METHODS: PaymentMethod[] = ["mpesa", "mixx", "airtel", "halopesa", "tpesa", "azampesa", "card", "cod"];

export default function AdminSettingsPage() {
  const { data } = useQuery({ queryKey: ["admin", "settings"], queryFn: getSettings });
  return (
    <RequirePermission perm="settings.manage">
      {data ? <SettingsForm initial={data} /> : <Skeleton className="h-[600px]" />}
    </RequirePermission>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function SettingsForm({ initial }: { initial: StoreSettings }) {
  const { t } = useT();
  const s = t.admin.settings;
  const refresh = useInvalidateAdmin();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<StoreSettings>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      setForm(await saveSettings(form));
      refresh();
      toast.success(s.saved);
    } catch (err) {
      toast.error(apiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title={s.title}
        subtitle={s.subtitle}
        actions={
          <Button onClick={save} loading={saving}>
            <Save />
            {t.admin.common.save}
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={s.store}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={s.storeName} htmlFor="st-name" className="sm:col-span-2">
              <Input id="st-name" value={form.storeName} onChange={(e) => set({ storeName: e.target.value })} />
            </Field>
            <Field label={s.email} htmlFor="st-email">
              <Input id="st-email" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </Field>
            <Field label={s.phone} htmlFor="st-phone">
              <Input id="st-phone" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
            <Field label={s.whatsapp} htmlFor="st-wa">
              <Input id="st-wa" value={form.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} />
            </Field>
            <Field label={s.address} htmlFor="st-address">
              <Input id="st-address" value={form.address} onChange={(e) => set({ address: e.target.value })} />
            </Field>
          </div>
        </Panel>
        <Panel title={s.payments}>
          <p className="mb-2 text-sm text-muted-foreground">{s.paymentsDesc}</p>
          <div className="divide-y divide-border">
            {METHODS.map((m) => (
              <div key={m} className="flex items-center justify-between gap-4 py-2.5">
                <span className="flex items-center gap-3 text-sm font-medium">
                  <PaymentMark method={m} className="h-6 min-w-14 text-[9px]" />
                  {m === "card" ? t.common.payment.card : m === "cod" ? t.common.payment.cod : t.common.payment[m]}
                </span>
                <Switch
                  checked={form.paymentMethods[m]}
                  onCheckedChange={(v) => set({ paymentMethods: { ...form.paymentMethods, [m]: v } })}
                  aria-label={m}
                />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title={`${s.regional} · ${s.tax}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={s.currency} htmlFor="st-cur">
              <Input id="st-cur" value="TZS — Tanzanian Shilling" disabled />
            </Field>
            <Field label={s.defaultLocale} htmlFor="st-locale">
              <NativeSelect id="st-locale" value={form.defaultLocale} onChange={(e) => set({ defaultLocale: e.target.value as "sw" | "en" })}>
                <option value="sw">{localeNames.sw}</option>
                <option value="en">{localeNames.en}</option>
              </NativeSelect>
            </Field>
            <Field label={s.vatRate} htmlFor="st-vat">
              <Input id="st-vat" type="number" value={form.vatRate} onChange={(e) => set({ vatRate: Number(e.target.value) })} />
            </Field>
            <div className="flex items-end">
              <div className="w-full">
                <ToggleRow label={s.pricesIncludeVat} checked={form.pricesIncludeVat} onChange={(v) => set({ pricesIncludeVat: v })} />
              </div>
            </div>
          </div>
        </Panel>
        <Panel title={s.orders}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={s.orderPrefix} htmlFor="st-prefix">
              <Input id="st-prefix" value={form.orderPrefix} onChange={(e) => set({ orderPrefix: e.target.value.toUpperCase() })} />
            </Field>
            <Field label={s.lowStockAlert} htmlFor="st-low">
              <Input id="st-low" type="number" value={form.lowStockAlert} onChange={(e) => set({ lowStockAlert: Number(e.target.value) })} />
            </Field>
          </div>
        </Panel>
        <Panel title={s.notifications}>
          <div className="divide-y divide-border">
            <ToggleRow label={s.notifyNewOrder} checked={form.notifyOnNewOrder} onChange={(v) => set({ notifyOnNewOrder: v })} />
            <ToggleRow label={s.notifyLowStock} checked={form.notifyOnLowStock} onChange={(v) => set({ notifyOnLowStock: v })} />
            <ToggleRow label={s.maintenance} desc={s.maintenanceDesc} checked={form.maintenanceMode} onChange={(v) => set({ maintenanceMode: v })} />
          </div>
        </Panel>
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Plug className="size-4 text-primary" />
              {s.integrations}
            </span>
          }
        >
          <p className="text-sm text-muted-foreground">{s.integrationsDesc}</p>
        </Panel>
      </div>
    </>
  );
}
