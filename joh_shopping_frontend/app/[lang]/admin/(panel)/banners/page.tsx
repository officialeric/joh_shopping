"use client";

import type { Banner } from "@/types";
import { ProductArt } from "@/components/brand/product-art";
import { Badge } from "@/components/ui/primitives";
import { CrudPage } from "@/components/admin/crud-page";
import { useAdminAll } from "@/lib/api/hooks";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export default function AdminBannersPage() {
  const { t, locale } = useT();
  const b = t.admin.banners;
  const cm = t.admin.common;
  const { data: products = [] } = useAdminAll("products");

  return (
    <CrudPage
      collection="banners"
      perm="content.manage"
      title={b.title}
      subtitle={b.subtitle}
      newLabel={b.new}
      editLabel={b.edit}
      wideForm
      initialParams={{ sort: "sortOrder" }}
      blank={() => ({
        title: { sw: "", en: "" },
        subtitle: { sw: "", en: "" },
        cta: { sw: "Nunua Sasa", en: "Shop Now" },
        href: "/products",
        placement: "hero" as const,
        theme: "dark" as const,
        active: true,
        sortOrder: 1,
      })}
      filters={[{ key: "placement", label: b.placement, options: (Object.keys(b.placements) as Banner["placement"][]).map((k) => ({ value: k, label: b.placements[k] })) }]}
      fields={[
        { name: "title.sw", label: b.titleSw, required: true },
        { name: "title.en", label: b.titleEn, required: true },
        { name: "subtitle.sw", label: b.subtitleSw, type: "textarea", rows: 2 },
        { name: "subtitle.en", label: b.subtitleEn, type: "textarea", rows: 2 },
        { name: "cta.sw", label: b.ctaSw },
        { name: "cta.en", label: b.ctaEn },
        { name: "href", label: b.link, placeholder: "/products?category=audio" },
        { name: "productId", label: b.product, type: "select", options: [{ value: "", label: "—" }, ...products.map((p) => ({ value: p.id, label: p.name }))] },
        { name: "placement", label: b.placement, type: "select", options: (Object.keys(b.placements) as Banner["placement"][]).map((k) => ({ value: k, label: b.placements[k] })) },
        { name: "theme", label: b.theme, type: "select", options: (Object.keys(b.themes) as Banner["theme"][]).map((k) => ({ value: k, label: b.themes[k] })) },
        { name: "sortOrder", label: cm.sortOrder, type: "number" },
        { name: "active", label: cm.active, type: "switch" },
      ]}
      columns={[
        {
          key: "preview",
          header: cm.preview,
          cell: (r) => {
            const p = products.find((x) => x.id === r.productId);
            return (
              <div
                className={cn(
                  "relative flex h-16 w-40 items-center overflow-hidden rounded-xl px-3",
                  r.theme === "red" ? "bg-brand-gradient text-white" : r.theme === "dark" ? "bg-neutral-950 text-white" : "bg-surface",
                )}
              >
                <span className="relative z-10 line-clamp-2 max-w-[60%] text-[11px] leading-tight font-semibold">{r.title[locale]}</span>
                {p && (
                  <div className="absolute -right-2 bottom-0 size-16">
                    <ProductArt kind={p.art.kind} camera={p.art.camera} color={p.colors[0]?.hex} />
                  </div>
                )}
              </div>
            );
          },
        },
        {
          key: "title",
          header: b.titleEn,
          cell: (r) => (
            <div className="max-w-xs">
              <p className="font-medium">{r.title[locale]}</p>
              <p className="truncate text-xs text-muted-foreground">{r.href}</p>
            </div>
          ),
        },
        { key: "placement", header: b.placement, cell: (r) => <Badge variant="outline">{b.placements[r.placement]}</Badge> },
        { key: "sort", header: cm.sortOrder, sort: "sortOrder", cell: (r) => r.sortOrder },
        { key: "active", header: cm.status, cell: (r) => <Badge variant={r.active ? "success" : "muted"}>{r.active ? cm.active : cm.inactive}</Badge> },
      ]}
    />
  );
}
