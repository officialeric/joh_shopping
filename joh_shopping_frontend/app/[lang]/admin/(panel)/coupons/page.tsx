"use client";

import type { Coupon } from "@/types";
import { Badge, Progress } from "@/components/ui/primitives";
import { CrudPage } from "@/components/admin/crud-page";
import { useT } from "@/lib/i18n/client";
import { formatDate, formatTZS } from "@/lib/utils";

export default function AdminCouponsPage() {
  const { t, locale } = useT();
  const c = t.admin.coupons;
  const cm = t.admin.common;
  const valueLabel = (r: Coupon) => (r.type === "percent" ? `${r.value}%` : r.type === "fixed" ? formatTZS(r.value) : c.types.free_shipping);
  const expired = (r: Coupon) => new Date(r.expiresAt).getTime() < Date.now();

  return (
    <CrudPage
      collection="coupons"
      perm="promotions.manage"
      title={c.title}
      subtitle={c.subtitle}
      newLabel={c.new}
      editLabel={c.edit}
      exportName="coupons"
      blank={() => ({
        code: `JOH${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        type: "percent" as const,
        value: 10,
        minSpend: 0,
        usageLimit: 100,
        used: 0,
        startsAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        active: true,
        description: { sw: "", en: "" },
      })}
      beforeSave={(r) => ({ ...r, code: r.code.toUpperCase().replace(/\s/g, ""), value: Number(r.value) || 0, minSpend: Number(r.minSpend) || 0 })}
      filters={[{ key: "type", label: c.type, options: (Object.keys(c.types) as Coupon["type"][]).map((k) => ({ value: k, label: c.types[k] })) }]}
      fields={[
        { name: "code", label: c.code, required: true },
        { name: "type", label: c.type, type: "select", options: (Object.keys(c.types) as Coupon["type"][]).map((k) => ({ value: k, label: c.types[k] })) },
        { name: "value", label: c.value, type: "number" },
        { name: "minSpend", label: c.minSpend, type: "number" },
        { name: "maxDiscount", label: c.maxDiscount, type: "number" },
        { name: "usageLimit", label: c.usageLimit, type: "number" },
        { name: "startsAt", label: c.starts, type: "date" },
        { name: "expiresAt", label: c.expires, type: "date" },
        { name: "description.sw", label: cm.descriptionSw },
        { name: "description.en", label: cm.descriptionEn },
        { name: "active", label: cm.active, type: "switch", span: 2 },
      ]}
      columns={[
        {
          key: "code",
          header: c.code,
          sort: "code",
          cell: (r) => (
            <div>
              <p className="font-mono font-semibold">{r.code}</p>
              <p className="text-xs text-muted-foreground">{r.description[locale]}</p>
            </div>
          ),
          csv: (r) => r.code,
        },
        { key: "value", header: c.value, cell: (r) => <span className="font-medium">{valueLabel(r)}</span>, csv: valueLabel },
        { key: "min", header: c.minSpend, cell: (r) => (r.minSpend ? formatTZS(r.minSpend) : "—"), csv: (r) => r.minSpend },
        {
          key: "usage",
          header: c.usage,
          sort: "used",
          cell: (r) => (
            <div className="w-28">
              <p className="mb-1 text-xs tabular-nums">
                {r.used} / {r.usageLimit}
              </p>
              <Progress value={(r.used / r.usageLimit) * 100} className="h-1.5" />
            </div>
          ),
          csv: (r) => r.used,
        },
        { key: "expires", header: c.expires, sort: "expiresAt", cell: (r) => formatDate(r.expiresAt, locale), csv: (r) => r.expiresAt },
        {
          key: "status",
          header: cm.status,
          cell: (r) =>
            expired(r) ? <Badge variant="muted">{c.expired}</Badge> : <Badge variant={r.active ? "success" : "muted"}>{r.active ? cm.active : cm.inactive}</Badge>,
        },
      ]}
    />
  );
}
