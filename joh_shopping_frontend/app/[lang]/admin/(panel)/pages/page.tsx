"use client";

import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { CrudPage } from "@/components/admin/crud-page";
import { useT } from "@/lib/i18n/client";
import { formatDate } from "@/lib/utils";

export default function AdminPagesPage() {
  const { t, locale } = useT();
  const p = t.admin.pages;
  const cm = t.admin.common;
  return (
    <CrudPage
      collection="pages"
      perm="content.manage"
      title={p.title}
      subtitle={p.subtitle}
      editLabel={p.edit}
      canCreate={false}
      wideForm
      blank={() => ({ slug: "", title: { sw: "", en: "" }, body: { sw: "", en: "" }, updatedAt: new Date().toISOString(), published: true })}
      beforeSave={(r) => ({ ...r, updatedAt: new Date().toISOString() })}
      fields={[
        { name: "title.sw", label: `${cm.name} (SW)`, required: true },
        { name: "title.en", label: `${cm.name} (EN)`, required: true },
        { name: "body.sw", label: p.bodySw, type: "textarea", rows: 10, hint: p.formatHint },
        { name: "body.en", label: p.bodyEn, type: "textarea", rows: 10, hint: p.formatHint },
        { name: "published", label: p.published, type: "switch", span: 2 },
      ]}
      actions={[{ label: cm.preview, icon: <ExternalLink />, onClick: (r) => window.open(`/${locale}/policies/${r.slug}`, "_blank") }]}
      columns={[
        {
          key: "title",
          header: cm.name,
          cell: (r) => (
            <div>
              <p className="font-medium">{r.title[locale]}</p>
              <p className="text-xs text-muted-foreground">/policies/{r.slug}</p>
            </div>
          ),
        },
        { key: "updated", header: cm.updatedAt, sort: "updatedAt", cell: (r) => formatDate(r.updatedAt, locale) },
        { key: "published", header: cm.status, cell: (r) => <Badge variant={r.published ? "success" : "muted"}>{r.published ? p.published : cm.inactive}</Badge> },
      ]}
    />
  );
}
