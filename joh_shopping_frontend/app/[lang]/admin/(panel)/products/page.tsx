"use client";

import { Copy, ExternalLink, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Badge } from "@/components/ui/primitives";
import { AdminPageHeader, RequirePermission } from "@/components/admin/admin-shell";
import { DataTable, useTableState, type Column } from "@/components/admin/data-table";
import { ProductThumb } from "@/components/admin/widgets";
import { useAdminAll, useAdminDelete, useAdminList, useInvalidateAdmin } from "@/lib/api/hooks";
import { saveProduct } from "@/lib/api/admin";
import { apiErrorMessage } from "@/lib/api/errors";
import { useLocalizedRouter, useT } from "@/lib/i18n/client";
import { fmt, formatTZS } from "@/lib/utils";

export default function AdminProductsPage() {
  const { t, locale } = useT();
  const { data: brands = [] } = useAdminAll("brands");
  const { data: categories = [] } = useAdminAll("categories");
  const p = t.admin.products;
  const router = useLocalizedRouter();
  const state = useTableState({ sort: "-createdAt" });
  const { data, isLoading } = useAdminList("products", state.params);
  const del = useAdminDelete("products");
  const refresh = useInvalidateAdmin();

  const stockBadge = (r: Product) => {
    const total = r.variants.reduce((s, v) => s + v.stock, 0);
    const low = r.variants.some((v) => v.stock <= r.lowStockThreshold);
    if (total === 0) return <Badge variant="danger">{p.outOfStock}</Badge>;
    return <Badge variant={low ? "warning" : "success"}>{total} · {low ? p.lowStock : p.inStock}</Badge>;
  };

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: t.admin.common.product,
      sort: "name",
      cell: (r) => (
        <div className="flex items-center gap-3">
          <ProductThumb productId={r.id} />
          <div className="min-w-0">
            <p className="truncate font-medium">{r.name}</p>
            <p className="text-xs text-muted-foreground">{fmt(p.variants, { n: r.variants.length })}</p>
          </div>
        </div>
      ),
      csv: (r) => r.name,
    },
    { key: "brand", header: p.brand, cell: (r) => brands.find((b) => b.id === r.brandId)?.name, csv: (r) => brands.find((b) => b.id === r.brandId)?.name ?? "" },
    { key: "category", header: p.category, cell: (r) => categories.find((c) => c.id === r.categoryId)?.name[locale], csv: (r) => r.categoryId },
    {
      key: "condition",
      header: p.condition,
      cell: (r) => (r.condition === "used" ? <Badge variant="secondary">{t.common.product.used} · {r.grade}</Badge> : <Badge variant="outline">{t.common.product.new}</Badge>),
      csv: (r) => r.condition,
    },
    { key: "price", header: p.price, sort: "price", cell: (r) => <span className="font-medium tabular-nums">{formatTZS(r.price)}</span>, csv: (r) => r.price },
    { key: "stock", header: p.stock, cell: stockBadge, csv: (r) => r.variants.reduce((s, v) => s + v.stock, 0) },
    { key: "sold", header: t.admin.reports.units, sort: "sold", cell: (r) => r.sold.toLocaleString("en-US"), csv: (r) => r.sold },
    {
      key: "status",
      header: t.admin.common.status,
      cell: (r) => <Badge variant={r.status === "published" ? "success" : r.status === "draft" ? "warning" : "muted"}>{p.status[r.status]}</Badge>,
      csv: (r) => r.status,
    },
  ];

  return (
    <RequirePermission perm="products.manage">
      <AdminPageHeader
        title={p.title}
        subtitle={p.subtitle}
        actions={
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus />
              {p.new}
            </Link>
          </Button>
        }
      />
      <DataTable
        data={data}
        loading={isLoading}
        columns={columns}
        state={state}
        exportName="products"
        onRowClick={(r) => router.push(`/admin/products/${r.id}`)}
        onDelete={(ids) => del.mutateAsync(ids)}
        filters={[
          { key: "categoryId", label: p.category, options: categories.map((c) => ({ value: c.id, label: c.name[locale] })) },
          { key: "brandId", label: p.brand, options: brands.map((b) => ({ value: b.id, label: b.name })) },
          { key: "condition", label: p.condition, options: [{ value: "new", label: t.common.product.new }, { value: "used", label: t.common.product.used }] },
          { key: "status", label: t.admin.common.status, options: (["published", "draft", "archived"] as const).map((s) => ({ value: s, label: p.status[s] })) },
        ]}
        actions={[
          { label: t.admin.common.edit, icon: <Pencil />, onClick: (r) => router.push(`/admin/products/${r.id}`) },
          {
            label: p.duplicate,
            icon: <Copy />,
            onClick: async (r) => {
              // The server assigns new ids for the copy and its variants.
              const { id: _id, ...copy } = structuredClone(r);
              void _id;
              try {
                await saveProduct({
                  ...copy,
                  slug: `${r.slug}-copy-${Date.now().toString(36)}`,
                  name: `${r.name} (copy)`,
                  status: "draft",
                  sold: 0,
                  variants: r.variants.map((v) => ({ ...v, id: "", sku: `${v.sku}-C${Date.now().toString(36).slice(-3).toUpperCase()}` })),
                });
                refresh();
                toast.success(t.admin.common.created);
              } catch (err) {
                toast.error(apiErrorMessage(err, t));
              }
            },
          },
          { label: p.viewInStore, icon: <ExternalLink />, onClick: (r) => window.open(`/${locale}/products/${r.slug}`, "_blank") },
        ]}
      />
    </RequirePermission>
  );
}
