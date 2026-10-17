"use client";

import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { CrudPage } from "@/components/admin/crud-page";
import { useShop } from "@/lib/data/shop-context";
import { useT } from "@/lib/i18n/client";
import { formatTZS } from "@/lib/utils";

export default function AdminShippingPage() {
  const { t, locale } = useT();
  const s = t.admin.shipping;
  const cm = t.admin.common;
  const { regions: tzRegions } = useShop();
  return (
    <div className="space-y-10">
      <CrudPage
        collection="zones"
        perm="shipping.manage"
        title={`${s.title} · ${s.zones}`}
        subtitle={s.subtitle}
        newLabel={s.newZone}
        editLabel={s.editZone}
        wideForm
        blank={() => ({ name: "", regions: [], standardFee: 10_000, expressFee: 0, freeAbove: 1_000_000, standardDays: "2-3", expressDays: "-", active: true })}
        fields={[
          { name: "name", label: cm.name, required: true },
          { name: "standardDays", label: s.standardDays },
          { name: "standardFee", label: s.standardFee, type: "number" },
          { name: "expressFee", label: s.expressFee, type: "number", hint: `0 = ${s.expressNA}` },
          { name: "freeAbove", label: s.freeAbove, type: "number" },
          { name: "expressDays", label: s.expressDays },
          { name: "regions", label: s.regions, type: "multicheck", options: tzRegions.map((r) => ({ value: r, label: r })) },
          { name: "active", label: cm.active, type: "switch", span: 2 },
        ]}
        columns={[
          {
            key: "name",
            header: cm.name,
            cell: (r) => (
              <div className="max-w-sm">
                <p className="font-medium">{r.name}</p>
                <p className="truncate text-xs text-muted-foreground">{r.regions.join(", ")}</p>
              </div>
            ),
          },
          { key: "std", header: s.standardFee, sort: "standardFee", cell: (r) => `${formatTZS(r.standardFee)} · ${r.standardDays}d` },
          { key: "exp", header: s.expressFee, cell: (r) => (r.expressFee ? `${formatTZS(r.expressFee)} · ${r.expressDays}d` : <span className="text-muted-foreground">{s.expressNA}</span>) },
          { key: "free", header: s.freeAbove, cell: (r) => formatTZS(r.freeAbove) },
          { key: "active", header: cm.status, cell: (r) => <Badge variant={r.active ? "success" : "muted"}>{r.active ? cm.active : cm.inactive}</Badge> },
        ]}
      />
      <CrudPage
        embedded
        collection="stores"
        perm="shipping.manage"
        title={s.stores}
        subtitle=""
        newLabel={s.newStore}
        editLabel={s.editStore}
        blank={() => ({ name: "Joh Shopping ", region: "Dar es Salaam", address: "", phone: "", hours: { sw: "", en: "" }, mapUrl: "" })}
        fields={[
          { name: "name", label: cm.name, required: true, span: 2 },
          { name: "region", label: cm.region, type: "select", options: tzRegions.map((r) => ({ value: r, label: r })) },
          { name: "phone", label: cm.phone, type: "tel" },
          { name: "address", label: s.address, required: true, span: 2 },
          { name: "hours.sw", label: s.hoursSw },
          { name: "hours.en", label: s.hoursEn },
          { name: "mapUrl", label: s.mapUrl, span: 2 },
        ]}
        columns={[
          {
            key: "name",
            header: cm.name,
            cell: (r) => (
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <MapPin className="size-4" />
                </span>
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.address}</p>
                </div>
              </div>
            ),
          },
          { key: "region", header: cm.region, cell: (r) => r.region },
          { key: "phone", header: cm.phone, cell: (r) => r.phone },
          { key: "hours", header: s.hoursEn.split(" (")[0], cell: (r) => <span className="text-xs">{r.hours[locale]}</span> },
        ]}
      />
    </div>
  );
}
