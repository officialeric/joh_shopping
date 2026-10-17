"use client";

import { AlertTriangle, Boxes, PackageX, Plus, SlidersHorizontal, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Paginated, Product, ProductVariant, SerialRecord, StockMovement } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Label, NativeSelect } from "@/components/ui/form-controls";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/overlays";
import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { AdminPageHeader, RequirePermission } from "@/components/admin/admin-shell";
import { DataTable, useTableState, type Column } from "@/components/admin/data-table";
import { ProductThumb, StatCard } from "@/components/admin/widgets";
import { adjustStock, registerSerial } from "@/lib/api/admin";
import { apiErrorMessage } from "@/lib/api/errors";
import { useAdminAll, useAdminList, useInvalidateAdmin } from "@/lib/api/hooks";
import { variantLabel } from "@/lib/data/catalog";
import { useT } from "@/lib/i18n/client";
import { formatDate, formatDateTime, formatTZS } from "@/lib/utils";

type Row = { id: string; product: Product; variant: ProductVariant; label: string };

export default function AdminInventoryPage() {
  const { t, locale } = useT();
  const inv = t.admin.inventory;
  const refresh = useInvalidateAdmin();
  const [lowOnly, setLowOnly] = useState(false);
  const [adjusting, setAdjusting] = useState<Row | null>(null);
  const [type, setType] = useState<StockMovement["type"]>("in");
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("");
  const [imeiOpen, setImeiOpen] = useState(false);
  const [imeiProduct, setImeiProduct] = useState("");
  const [imei, setImei] = useState("");

  // Stock levels are derived from product variants (one row per variant).
  const { data: allProducts } = useAdminAll("products");
  const { data: categories = [] } = useAdminAll("categories");
  const levelsState = useTableState({ perPage: 10 });
  const levels = useMemo((): Paginated<Row> | undefined => {
      if (!allProducts) return undefined;
      let rows: Row[] = allProducts.flatMap((p) =>
        p.variants.map((v) => ({
          id: v.id,
          product: p,
          variant: v,
          label: [p.colors.find((c) => c.hex === v.color)?.name[locale], v.storage].filter(Boolean).join(" · "),
        })),
      );
      const q = levelsState.params.search?.toLowerCase();
      if (q) rows = rows.filter((r) => r.product.name.toLowerCase().includes(q) || r.variant.sku.toLowerCase().includes(q));
      if (lowOnly) rows = rows.filter((r) => r.variant.stock <= r.product.lowStockThreshold);
      const cat = levelsState.params.filters?.categoryId;
      if (cat && cat !== "all") rows = rows.filter((r) => r.product.categoryId === cat);
      rows.sort((a, b) => a.variant.stock - b.variant.stock);
      const per = levelsState.params.perPage ?? 10;
      const page = levelsState.params.page ?? 1;
      const last = Math.max(1, Math.ceil(rows.length / per));
      const data = rows.slice((page - 1) * per, page * per);
      return { data, meta: { current_page: page, last_page: last, per_page: per, total: rows.length, from: rows.length ? (page - 1) * per + 1 : null, to: (page - 1) * per + data.length } };
  }, [allProducts, levelsState.params, lowOnly, locale]);

  const allVariants = (allProducts ?? []).flatMap((p) => p.variants.map((v) => ({ p, v })));
  const stats = ((variants) => ({
      units: variants.reduce((s, x) => s + x.v.stock, 0),
      value: variants.reduce((s, x) => s + x.v.stock * x.v.price, 0),
      low: variants.filter((x) => x.v.stock > 0 && x.v.stock <= x.p.lowStockThreshold).length,
      out: variants.filter((x) => x.v.stock === 0).length,
  }))(allVariants);

  const movementsState = useTableState({ sort: "-createdAt" });
  const { data: movements, isLoading: mLoading } = useAdminList("stockMovements", movementsState.params);
  const serialsState = useTableState({ sort: "-receivedAt" });
  const { data: serials, isLoading: sLoading } = useAdminList("serials", serialsState.params);

  const levelColumns: Column<Row>[] = [
    {
      key: "product",
      header: t.admin.common.product,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <ProductThumb productId={r.product.id} color={r.variant.color} />
          <div>
            <p className="font-medium">{r.product.name}</p>
            <p className="text-xs text-muted-foreground">{r.label}</p>
          </div>
        </div>
      ),
      csv: (r) => `${r.product.name} ${r.label}`,
    },
    { key: "sku", header: t.admin.products.sku, cell: (r) => <span className="font-mono text-xs">{r.variant.sku}</span>, csv: (r) => r.variant.sku },
    { key: "price", header: t.admin.products.price, cell: (r) => formatTZS(r.variant.price), csv: (r) => r.variant.price },
    { key: "threshold", header: inv.threshold, cell: (r) => r.product.lowStockThreshold },
    {
      key: "stock",
      header: inv.onHand,
      cell: (r) => (
        <Badge variant={r.variant.stock === 0 ? "danger" : r.variant.stock <= r.product.lowStockThreshold ? "warning" : "success"} className="tabular-nums">
          {r.variant.stock}
        </Badge>
      ),
      csv: (r) => r.variant.stock,
    },
  ];

  const movementColumns: Column<StockMovement>[] = [
    { key: "date", header: t.admin.common.date, sort: "createdAt", cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.createdAt, locale)}</span>, csv: (r) => r.createdAt },
    {
      key: "product",
      header: t.admin.common.product,
      cell: (r) => (
        <div>
          <p className="font-medium">{r.productName}</p>
          <p className="text-xs text-muted-foreground">{r.variantLabel}</p>
        </div>
      ),
      csv: (r) => r.productName,
    },
    { key: "type", header: t.admin.common.type, cell: (r) => <Badge variant={r.type === "in" || r.type === "return" ? "success" : r.type === "out" ? "info" : "warning"}>{inv.types[r.type]}</Badge>, csv: (r) => r.type },
    { key: "qty", header: inv.qty, cell: (r) => <span className={`font-semibold tabular-nums ${r.qty > 0 ? "text-success" : "text-destructive"}`}>{r.qty > 0 ? `+${r.qty}` : r.qty}</span>, csv: (r) => r.qty },
    { key: "reason", header: inv.reason, cell: (r) => <span className="text-muted-foreground">{r.reason}</span>, csv: (r) => r.reason },
    { key: "by", header: inv.by, cell: (r) => r.by, csv: (r) => r.by },
  ];

  const serialColumns: Column<SerialRecord>[] = [
    { key: "imei", header: inv.imei, sort: "imei", cell: (r) => <span className="font-mono text-xs font-medium">{r.imei}</span>, csv: (r) => r.imei },
    {
      key: "product",
      header: t.admin.common.product,
      cell: (r) => (
        <div>
          <p className="font-medium">{r.productName}</p>
          <p className="text-xs text-muted-foreground">{r.variantLabel}</p>
        </div>
      ),
      csv: (r) => r.productName,
    },
    {
      key: "status",
      header: t.admin.common.status,
      cell: (r) => <Badge variant={r.status === "in_stock" ? "success" : r.status === "sold" ? "info" : r.status === "returned" ? "warning" : "danger"}>{inv.serialStatus[r.status]}</Badge>,
      csv: (r) => r.status,
    },
    { key: "order", header: t.admin.orders.number, cell: (r) => (r.orderNumber ? `${r.orderNumber} · ${r.customerName}` : "—"), csv: (r) => r.orderNumber ?? "" },
    { key: "warranty", header: inv.warrantyUntil, cell: (r) => (r.warrantyUntil ? formatDate(r.warrantyUntil, locale) : "—") },
    { key: "received", header: inv.received, sort: "receivedAt", cell: (r) => formatDate(r.receivedAt, locale) },
  ];

  const phones = (allProducts ?? []).filter((p) => p.categoryId === "c-phones");

  return (
    <RequirePermission perm="inventory.manage">
      <AdminPageHeader title={inv.title} subtitle={inv.subtitle} />
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard tone="brand" label={inv.stockValue} value={formatTZS(stats.value, { compact: true })} icon={Wallet} />
        <StatCard label={inv.totalUnits} value={stats.units.toLocaleString("en-US")} icon={Boxes} />
        <StatCard label={inv.lowItems} value={stats.low} icon={AlertTriangle} />
        <StatCard label={inv.outItems} value={stats.out} icon={PackageX} />
      </div>
      <Tabs defaultValue="levels">
        <TabsList className="mb-5">
          <TabsTrigger value="levels">{inv.tabs.levels}</TabsTrigger>
          <TabsTrigger value="movements">{inv.tabs.movements}</TabsTrigger>
          <TabsTrigger value="serials">{inv.tabs.serials}</TabsTrigger>
        </TabsList>
        <TabsContent value="levels">
          <DataTable
            data={levels}
            columns={levelColumns}
            state={levelsState}
            exportName="stock-levels"
            filters={[{ key: "categoryId", label: t.admin.products.category, options: categories.map((c) => ({ value: c.id, label: c.name[locale] })) }]}
            toolbar={
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={lowOnly} onCheckedChange={(v) => setLowOnly(!!v)} />
                {inv.filterLow}
              </label>
            }
            actions={[
              {
                label: inv.adjust,
                icon: <SlidersHorizontal />,
                onClick: (r) => {
                  setAdjusting(r);
                  setType("in");
                  setQty(1);
                  setReason("");
                },
              },
            ]}
          />
        </TabsContent>
        <TabsContent value="movements">
          <DataTable
            data={movements}
            loading={mLoading}
            columns={movementColumns}
            state={movementsState}
            exportName="stock-movements"
            filters={[{ key: "type", label: t.admin.common.type, options: (Object.keys(inv.types) as StockMovement["type"][]).map((k) => ({ value: k, label: inv.types[k] })) }]}
          />
        </TabsContent>
        <TabsContent value="serials">
          <DataTable
            data={serials}
            loading={sLoading}
            columns={serialColumns}
            state={serialsState}
            exportName="imei-register"
            filters={[{ key: "status", label: t.admin.common.status, options: (Object.keys(inv.serialStatus) as SerialRecord["status"][]).map((k) => ({ value: k, label: inv.serialStatus[k] })) }]}
            toolbar={
              <Button size="sm" onClick={() => setImeiOpen(true)}>
                <Plus />
                {inv.registerImei}
              </Button>
            }
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!adjusting} onOpenChange={(o) => !o && setAdjusting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{inv.adjustTitle}</DialogTitle>
            <DialogDescription>
              {adjusting?.product.name} · {adjusting?.label} — {inv.onHand}: {adjusting?.variant.stock}
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!adjusting || !qty) return;
              try {
                await adjustStock(adjusting.product.id, adjusting.variant.id, type, qty, reason || inv.types[type]);
                setAdjusting(null);
                refresh();
                toast.success(inv.adjusted);
              } catch (err) {
                toast.error(apiErrorMessage(err, t));
              }
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label={inv.adjustType} htmlFor="adj-type">
                <NativeSelect id="adj-type" value={type} onChange={(e) => setType(e.target.value as StockMovement["type"])}>
                  {(Object.keys(inv.types) as StockMovement["type"][]).map((k) => (
                    <option key={k} value={k}>
                      {inv.types[k]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={inv.qty} htmlFor="adj-qty" hint={type === "adjustment" ? "±" : undefined}>
                <Input id="adj-qty" type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
              </Field>
            </div>
            <Field label={inv.reason} htmlFor="adj-reason">
              <Input id="adj-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <Button type="submit">{t.admin.common.save}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={imeiOpen} onOpenChange={setImeiOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{inv.registerImei}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!/^\d{15}$/.test(imei)) return toast.error(inv.imeiInvalid);
              const p = phones.find((x) => x.id === (imeiProduct || phones[0]?.id));
              if (!p) return;
              try {
                await registerSerial(p.id, (p.variants[0] && variantLabel(p, p.variants[0], "en")) || p.name, imei);
                setImei("");
                setImeiOpen(false);
                refresh();
                toast.success(inv.registered);
              } catch (err) {
                toast.error(apiErrorMessage(err, t));
              }
            }}
          >
            <Field label={t.admin.common.product} htmlFor="imei-product">
              <NativeSelect id="imei-product" value={imeiProduct} onChange={(e) => setImeiProduct(e.target.value)}>
                {phones.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="grid gap-2">
              <Label htmlFor="imei-code">{inv.imei}</Label>
              <Input id="imei-code" inputMode="numeric" className="font-mono" value={imei} onChange={(e) => setImei(e.target.value.replace(/\D/g, "").slice(0, 15))} />
              <p className="text-xs text-muted-foreground">{t.account.returns.imeiHint}</p>
            </div>
            <Button type="submit">{t.admin.common.save}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </RequirePermission>
  );
}
