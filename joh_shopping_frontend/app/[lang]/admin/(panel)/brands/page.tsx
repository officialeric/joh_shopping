"use client";

import { Badge } from "@/components/ui/primitives";
import { CrudPage } from "@/components/admin/crud-page";
import { useT } from "@/lib/i18n/client";
import { slugify } from "@/lib/utils";

export default function AdminBrandsPage() {
  const { t } = useT();
  const b = t.admin.brands;
  const cm = t.admin.common;
  return (
    <CrudPage
      collection="brands"
      perm="categories.manage"
      title={b.title}
      subtitle={b.subtitle}
      newLabel={b.new}
      editLabel={b.edit}
      exportName="brands"
      initialParams={{ sort: "name" }}
      blank={() => ({ slug: "", name: "", country: "", active: true, productCount: 0 })}
      beforeSave={(r) => ({ ...r, slug: r.slug || slugify(r.name) })}
      fields={[
        { name: "name", label: cm.name, required: true },
        { name: "slug", label: cm.slug },
        { name: "country", label: b.country },
        { name: "active", label: cm.active, type: "switch" },
      ]}
      columns={[
        {
          key: "name",
          header: cm.name,
          sort: "name",
          cell: (r) => (
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-secondary font-display text-sm font-bold text-secondary-foreground">{r.name[0]}</span>
              <span className="font-medium">{r.name}</span>
            </div>
          ),
          csv: (r) => r.name,
        },
        { key: "country", header: b.country, sort: "country", cell: (r) => r.country, csv: (r) => r.country },
        { key: "products", header: cm.products, cell: (r) => r.productCount, csv: (r) => r.productCount },
        { key: "active", header: cm.status, cell: (r) => <Badge variant={r.active ? "success" : "muted"}>{r.active ? cm.active : cm.inactive}</Badge> },
      ]}
    />
  );
}
