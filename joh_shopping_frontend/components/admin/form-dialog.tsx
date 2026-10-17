"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Label, NativeSelect, Switch, Textarea } from "@/components/ui/form-controls";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/overlays";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { apiErrorMessage, apiFieldErrors } from "@/lib/api/errors";

export type FieldDef = {
  name: string; // dot path, e.g. "name.sw"
  label: string;
  type?: "text" | "number" | "textarea" | "select" | "switch" | "date" | "datetime" | "color" | "multicheck" | "email" | "tel";
  options?: { value: string; label: string }[];
  required?: boolean;
  span?: 1 | 2;
  hint?: string;
  placeholder?: string;
  rows?: number;
};

export function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

export function setPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const clone = structuredClone(obj) as Record<string, unknown>;
  let cur = clone;
  keys.slice(0, -1).forEach((k) => {
    if (typeof cur[k] !== "object" || cur[k] === null) cur[k] = {};
    cur = cur[k] as Record<string, unknown>;
  });
  cur[keys.at(-1)!] = value;
  return clone as T;
}

/** Generic create/edit dialog driven by a field list. */
export function FormDialog<T extends object>({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initial,
  onSubmit,
  wide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FieldDef[];
  initial: T;
  onSubmit: (values: T) => Promise<unknown>;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-xl", wide && "max-w-3xl")}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {open && <FormBody fields={fields} initial={initial} onSubmit={onSubmit} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function FormBody<T extends object>({
  fields,
  initial,
  onSubmit,
  onCancel,
}: {
  fields: FieldDef[];
  initial: T;
  onSubmit: (values: T) => Promise<unknown>;
  onCancel: () => void;
}) {
  const { t } = useT();
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (name: string, value: unknown) => setValues((v) => setPath(v, name, value));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    for (const f of fields) {
      const v = getPath(values, f.name);
      if (f.required && (v === undefined || v === null || String(v).trim() === "")) errs[f.name] = t.admin.common.required;
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await onSubmit(values);
      toast.success(t.admin.common.saved);
      onCancel();
    } catch (err) {
      // Laravel's 422 keys ("name.sw", "regions") match the field names here.
      const fieldErrors = apiFieldErrors(err, t);
      setErrors(fieldErrors);
      toast.error(apiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      {fields.map((f) => {
        const v = getPath(values, f.name);
        const id = `f-${f.name.replace(/\./g, "-")}`;
        const span = f.span === 2 || f.type === "textarea" || f.type === "multicheck" ? "sm:col-span-2" : "";
        if (f.type === "switch") {
          return (
            <div key={f.name} className={cn("flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3", span)}>
              <Label htmlFor={id}>{f.label}</Label>
              <Switch id={id} checked={!!v} onCheckedChange={(c) => set(f.name, c)} />
            </div>
          );
        }
        return (
          <Field key={f.name} label={f.label} htmlFor={id} error={errors[f.name]} hint={f.hint} className={span}>
            {f.type === "textarea" ? (
              <Textarea id={id} rows={f.rows} className={f.rows ? "min-h-0" : undefined} placeholder={f.placeholder} value={String(v ?? "")} onChange={(e) => set(f.name, e.target.value)} />
            ) : f.type === "select" ? (
              <NativeSelect id={id} value={String(v ?? "")} onChange={(e) => set(f.name, e.target.value)}>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            ) : f.type === "multicheck" ? (
              <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-border p-3 sm:grid-cols-3">
                {f.options?.map((o) => {
                  const list = (v as string[]) ?? [];
                  return (
                    <label key={o.value} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={list.includes(o.value)} onCheckedChange={(c) => set(f.name, c ? [...list, o.value] : list.filter((x) => x !== o.value))} />
                      {o.label}
                    </label>
                  );
                })}
              </div>
            ) : f.type === "color" ? (
              <div className="flex gap-2">
                <input type="color" value={String(v ?? "#000000")} onChange={(e) => set(f.name, e.target.value)} className="h-11 w-14 cursor-pointer rounded-xl border border-input bg-card p-1" aria-label={f.label} />
                <Input id={id} value={String(v ?? "")} onChange={(e) => set(f.name, e.target.value)} />
              </div>
            ) : (
              <Input
                id={id}
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "datetime" ? "datetime-local" : f.type ?? "text"}
                placeholder={f.placeholder}
                value={
                  f.type === "date" && typeof v === "string" ? v.slice(0, 10) : f.type === "datetime" && typeof v === "string" ? v.slice(0, 16) : String(v ?? "")
                }
                onChange={(e) =>
                  set(
                    f.name,
                    f.type === "number"
                      ? e.target.value === ""
                        ? ""
                        : Number(e.target.value)
                      : f.type === "date" || f.type === "datetime"
                        ? e.target.value
                          ? new Date(e.target.value).toISOString()
                          : ""
                        : e.target.value,
                  )
                }
                aria-invalid={!!errors[f.name]}
              />
            )}
          </Field>
        );
      })}
      <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t.admin.common.cancel}
        </Button>
        <Button type="submit" loading={saving}>
          {t.admin.common.save}
        </Button>
      </div>
    </form>
  );
}
