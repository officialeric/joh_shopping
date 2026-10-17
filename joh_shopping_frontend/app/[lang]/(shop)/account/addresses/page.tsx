"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Address } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Label, NativeSelect } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/feedback";
import { ConfirmDialog, Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/overlays";
import { Badge, Skeleton } from "@/components/ui/primitives";
import { AccountHeader, useAccountUser } from "@/components/account/account-shell";
import { useShop } from "@/lib/data/shop-context";
import { deleteAddress, myAddresses, saveAddress } from "@/lib/api/shop";
import { useT } from "@/lib/i18n/client";
import { TZ_PHONE_REGEX } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api/errors";

type Draft = Omit<Address, "id"> & { id?: string };

export default function AddressesPage() {
  const { regions: tzRegions } = useShop();
  const { t } = useT();
  const a = t.account.addresses;
  const c = t.shop.checkout;
  const user = useAccountUser();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["addresses", user.id], queryFn: () => myAddresses() });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const blank: Draft = { label: "", fullName: user.name, phone: user.phone, region: "Dar es Salaam", district: "", street: "", landmark: "", isDefault: false };
  const refresh = () => qc.invalidateQueries({ queryKey: ["addresses", user.id] });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const errs: Record<string, string> = {};
    if (!draft.label.trim()) errs.label = t.common.validation.required;
    if (!draft.fullName.trim()) errs.fullName = t.common.validation.required;
    if (!TZ_PHONE_REGEX.test(draft.phone.replace(/\s/g, ""))) errs.phone = t.common.validation.phone;
    if (!draft.district.trim()) errs.district = t.common.validation.required;
    if (!draft.street.trim()) errs.street = t.common.validation.required;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await saveAddress(draft);
      setDraft(null);
      refresh();
      toast.success(a.saved);
    } catch (err) {
      toast.error(apiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <>
      <AccountHeader
        title={a.title}
        subtitle={a.subtitle}
        action={
          <Button onClick={() => setDraft(blank)}>
            <Plus />
            {a.add}
          </Button>
        }
      />
      {isLoading ? (
        <Skeleton className="h-48" />
      ) : !data?.length ? (
        <EmptyState icon={<MapPin />} title={a.empty} description={a.emptyDesc} action={<Button onClick={() => setDraft(blank)}>{a.add}</Button>} className="rounded-[24px] border border-dashed border-border" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((addr) => (
            <div key={addr.id} className="flex flex-col rounded-[20px] border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="flex items-center gap-2 font-semibold">
                  <MapPin className="size-4 text-primary" />
                  {addr.label}
                </p>
                {addr.isDefault && <Badge variant="soft">{a.default}</Badge>}
              </div>
              <div className="mt-3 flex-1 space-y-0.5 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{addr.fullName}</p>
                <p>{addr.phone}</p>
                <p>{addr.street}</p>
                <p>
                  {addr.district}, {addr.region}
                </p>
                {addr.landmark && <p className="italic">{addr.landmark}</p>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                <Button size="sm" variant="outline" onClick={() => setDraft(addr)}>
                  <Pencil />
                  {t.common.actions.edit}
                </Button>
                {!addr.isDefault && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await saveAddress({ ...addr, isDefault: true }).catch((err) => toast.error(apiErrorMessage(err, t)));
                      refresh();
                    }}
                  >
                    {a.setDefault}
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="ml-auto text-destructive hover:text-destructive" onClick={() => setToDelete(addr.id)} aria-label={t.common.actions.delete}>
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? a.edit : a.add}</DialogTitle>
          </DialogHeader>
          {draft && (
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
              <Field label={a.label} htmlFor="a-label" error={errors.label}>
                <Input id="a-label" placeholder={a.labelPlaceholder} value={draft.label} onChange={(e) => set({ label: e.target.value })} />
              </Field>
              <Field label={a.fullName} htmlFor="a-name" error={errors.fullName}>
                <Input id="a-name" value={draft.fullName} onChange={(e) => set({ fullName: e.target.value })} />
              </Field>
              <Field label={c.phone} htmlFor="a-phone" error={errors.phone}>
                <Input id="a-phone" type="tel" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} />
              </Field>
              <Field label={c.region} htmlFor="a-region">
                <NativeSelect id="a-region" value={draft.region} onChange={(e) => set({ region: e.target.value })}>
                  {tzRegions.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={c.district} htmlFor="a-district" error={errors.district}>
                <Input id="a-district" value={draft.district} onChange={(e) => set({ district: e.target.value })} />
              </Field>
              <Field label={c.landmark} htmlFor="a-landmark" optional={t.common.misc.optional}>
                <Input id="a-landmark" value={draft.landmark ?? ""} onChange={(e) => set({ landmark: e.target.value })} />
              </Field>
              <Field label={c.street} htmlFor="a-street" error={errors.street} className="sm:col-span-2">
                <Input id="a-street" placeholder={c.streetPlaceholder} value={draft.street} onChange={(e) => set({ street: e.target.value })} />
              </Field>
              <div className="flex items-center gap-2.5 sm:col-span-2">
                <Checkbox id="a-default" checked={draft.isDefault} onCheckedChange={(v) => set({ isDefault: !!v })} />
                <Label htmlFor="a-default" className="font-normal">
                  {a.makeDefault}
                </Label>
              </div>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                  {t.common.actions.cancel}
                </Button>
                <Button type="submit" loading={saving}>
                  {t.common.actions.save}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t.common.misc.confirmDelete}
        description={t.common.misc.confirmDeleteDesc}
        confirmLabel={t.common.actions.delete}
        cancelLabel={t.common.actions.cancel}
        onConfirm={async () => {
          try {
            await deleteAddress(toDelete!);
            refresh();
            toast.success(a.deleted);
          } catch (err) {
            toast.error(apiErrorMessage(err, t));
          }
        }}
      />
    </>
  );
}
