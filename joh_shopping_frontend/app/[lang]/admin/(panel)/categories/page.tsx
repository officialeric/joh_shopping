"use client";

import type { Category } from "@/types";
import { CategoryIcon, categoryIcons } from "@/components/brand/icons";
import { Badge } from "@/components/ui/primitives";
import { CrudPage } from "@/components/admin/crud-page";
import { useAdminAll } from "@/lib/api/hooks";
import { useT } from "@/lib/i18n/client";
import { slugify } from "@/lib/utils";

export default function AdminCategoriesPage() {
  const { t, locale } = useT();
  const c = t.admin.categories;
  const cm = t.admin.common;
  const { data: parents = [] } = useAdminAll("categories");

  return (
    <CrudPage
      collection="categories"
      perm="categories.manage"
      title={c.title}
      subtitle={c.subtitle}
      newLabel={c.new}
      editLabel={c.edit}
      exportName="categories"
      initialParams={{ sort: "sortOrder" }}
      blank={() => ({
        slug: "",
        name: { sw: "", en: "" },
        description: { sw: "", en: "" },
        parentId: null,
        icon: "smartphone",
        art: "phone" as const,
        productCount: 0,
        active: true,
        sortOrder: parents.length + 1,
      })}
      beforeSave={(r) => ({ ...r, slug: r.slug || slugify(r.name.en), parentId: r.parentId || null }) as Category}
      fields={[
        { name: "name.sw", label: cm.nameSw, required: true },
        { name: "name.en", label: cm.nameEn, required: true },
        { name: "slug", label: cm.slug, hint: "smartphones" },
        {
          name: "parentId",
          label: c.parent,
          type: "select",
          options: [{ value: "", label: c.none }, ...parents.map((p) => ({ value: p.id, label: p.name[locale] }))],
        },
        { name: "description.sw", label: cm.descriptionSw, type: "textarea", rows: 2 },
        { name: "description.en", label: cm.descriptionEn, type: "textarea", rows: 2 },
        { name: "icon", label: c.icon, type: "select", options: Object.keys(categoryIcons).map((k) => ({ value: k, label: k })) },
        { name: "sortOrder", label: cm.sortOrder, type: "number" },
        { name: "active", label: cm.active, type: "switch", span: 2 },
      ]}
      columns={[
        {
          key: "name",
          header: cm.name,
          sort: "sortOrder",
          cell: (r) => (
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <CategoryIcon name={r.icon} className="size-4" />
              </span>
              <div>
                <p className="font-medium">{r.name[locale]}</p>
                <p className="text-xs text-muted-foreground">/{r.slug}</p>
              </div>
            </div>
          ),
          csv: (r) => r.name.en,
        },
        { key: "parent", header: c.parent, cell: (r) => parents.find((p) => p.id === r.parentId)?.name[locale] ?? "—" },
        { key: "count", header: c.productCount, cell: (r) => r.productCount, csv: (r) => r.productCount },
        { key: "sort", header: cm.sortOrder, cell: (r) => r.sortOrder },
        { key: "active", header: cm.status, cell: (r) => <Badge variant={r.active ? "success" : "muted"}>{r.active ? cm.active : cm.inactive}</Badge> },
      ]}
    />
  );
}
