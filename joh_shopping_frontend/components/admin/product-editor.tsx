"use client";

import { ArrowLeft, ImagePlus, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ColorOption, Product, ProductTag, ProductVariant } from "@/types";
import { ProductArt } from "@/components/brand/product-art";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Label, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { Link } from "@/components/ui/link";
import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { Panel } from "@/components/admin/widgets";
import { saveProduct, uploadImage } from "@/lib/api/admin";
import { apiErrorMessage, apiFieldErrors } from "@/lib/api/errors";
import { useAdminAll, useInvalidateAdmin } from "@/lib/api/hooks";
import { useLocalizedRouter, useT } from "@/lib/i18n/client";
import { cn, formatTZS, slugify } from "@/lib/utils";

const TAGS: ProductTag[] = ["new", "featured", "bestseller", "deal", "trending"];

/** Unsaved variants get a temporary id (for React keys); the API assigns real ids on save. */
const TEMP_VARIANT = "new-";
let tempVariantSeq = 0;
const tempVariantId = () => `${TEMP_VARIANT}${++tempVariantSeq}`;

/** A new, unsaved product (empty id — the API creates it). */
export function blankProduct(): Product {
  return {
    id: "",
    slug: "",
    name: "",
    brandId: "",
    categoryId: "c-phones",
    condition: "new",
    shortDescription: { sw: "", en: "" },
    description: { sw: "", en: "" },
    highlights: [],
    inBox: [],
    price: 0,
    colors: [{ name: { sw: "Nyeusi", en: "Black" }, hex: "#1f2023" }],
    storages: ["128GB"],
    rams: ["8GB"],
    variants: [{ id: tempVariantId(), sku: "", color: "#1f2023", storage: "128GB", ram: "8GB", price: 0, stock: 0 }],
    specs: [],
    rating: 0,
    reviewCount: 0,
    sold: 0,
    warrantyMonths: 12,
    tags: [],
    images: [],
    art: { kind: "phone", camera: "trio-square" },
    compatibleWith: [],
    status: "draft",
    lowStockThreshold: 5,
    seo: { title: "", description: "" },
    createdAt: "",
  };
}

export function ProductEditor({ initial, isNew }: { initial: Product; isNew?: boolean }) {
  const { t, locale } = useT();
  const p = t.admin.products;
  const router = useLocalizedRouter();
  const refresh = useInvalidateAdmin();
  const [product, setProduct] = useState<Product>(initial);
  const [saving, setSaving] = useState(false);
  const [newStorage, setNewStorage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<Product>) => setProduct((cur) => ({ ...cur, ...patch }));
  const isPhone = product.categoryId === "c-phones";
  const { data: brands = [] } = useAdminAll("brands");
  const { data: categories = [] } = useAdminAll("categories");
  const { data: attributes = [] } = useAdminAll("attributes");
  const [uploading, setUploading] = useState(false);
  const storageOptions = attributes.filter((a) => a.type === "storage").map((a) => a.value);
  const ramOptions = attributes.filter((a) => a.type === "ram").map((a) => a.value);
  const brandId = product.brandId || brands[0]?.id || "";

  const save = async (status: Product["status"]) => {
    const errs: Record<string, string> = {};
    if (!product.name.trim()) errs.name = t.admin.common.required;
    if (!product.variants.length) errs.variants = t.admin.common.required;
    if (product.variants.some((v) => !(v.price > 0))) errs.variants = t.common.validation.positive;
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error(Object.values(errs)[0]);
      return;
    }
    setSaving(true);
    const slug = product.slug || slugify(product.name);
    try {
      const saved = await saveProduct({
        ...product,
        brandId,
        slug,
        status,
        art: { ...product.art, kind: isPhone ? "phone" : (categories.find((c) => c.id === product.categoryId)?.art ?? "case") },
        variants: product.variants.map((v, i) => ({
          ...v,
          id: v.id.startsWith(TEMP_VARIANT) ? "" : v.id,
          sku: v.sku || `${slug.toUpperCase().replace(/-/g, "")}-${v.storage ?? ""}-${i}`,
        })),
        seo: { title: product.seo.title || `${product.name} | Joh Shopping`, description: product.seo.description || product.shortDescription.en },
      });
      refresh();
      toast.success(t.admin.common.saved);
      if (isNew) router.replace(`/admin/products/${saved.id}`);
      else setProduct(saved);
    } catch (err) {
      setErrors(apiFieldErrors(err, t));
      toast.error(apiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  const generateVariants = () => {
    const variants: ProductVariant[] = [];
    product.colors.forEach((c) => {
      const storages = product.storages.length ? product.storages : [undefined];
      storages.forEach((s) => {
        const existing = product.variants.find((v) => v.color === c.hex && v.storage === s);
        variants.push(
          existing ?? {
            id: tempVariantId(),
            sku: "",
            color: c.hex,
            storage: s,
            ram: product.rams[0],
            price: product.variants[0]?.price ?? 0,
            compareAtPrice: product.variants[0]?.compareAtPrice,
            stock: 0,
          },
        );
      });
    });
    set({ variants });
  };

  const updateVariant = (id: string, patch: Partial<ProductVariant>) => set({ variants: product.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)) });
  const updateColor = (i: number, patch: Partial<ColorOption>) => {
    const old = product.colors[i]!;
    const colors = product.colors.map((c, j) => (j === i ? { ...c, ...patch } : c));
    const variants = patch.hex ? product.variants.map((v) => (v.color === old.hex ? { ...v, color: patch.hex! } : v)) : product.variants;
    set({ colors, variants });
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/products" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {p.title}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-xl bg-surface p-1">
            {product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element -- uploaded photo served from the API's storage
              <img src={product.images[0]} alt="" className="size-full rounded-lg object-cover" />
            ) : (
              <ProductArt kind={isPhone ? "phone" : categories.find((c) => c.id === product.categoryId)?.art ?? "case"} camera={product.art.camera} color={product.colors[0]?.hex} view={isPhone ? "back" : undefined} />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{product.name || p.new}</h1>
            <Badge variant={product.status === "published" ? "success" : "warning"} className="mt-1">
              {p.status[product.status]}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <Button variant="ghost" asChild>
              <a href={`/${locale}/products/${product.slug}`} target="_blank" rel="noreferrer">
                {p.viewInStore}
              </a>
            </Button>
          )}
          <Button variant="outline" onClick={() => save("draft")} loading={saving}>
            {p.saveDraft}
          </Button>
          <Button onClick={() => save("published")} loading={saving}>
            {p.publish}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList variant="line" className="mb-6">
          {(Object.keys(p.tabs) as (keyof typeof p.tabs)[]).map((k) => (
            <TabsTrigger key={k} value={k}>
              {p.tabs[k]}
              {k === "variants" && <span className="rounded-full bg-muted px-1.5 text-[10px]">{product.variants.length}</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <Panel>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={p.name} htmlFor="p-name" error={errors.name} className="sm:col-span-2">
                  <Input id="p-name" value={product.name} onChange={(e) => set({ name: e.target.value })} />
                </Field>
                <Field label={t.admin.common.slug} htmlFor="p-slug" hint={`/products/${product.slug || slugify(product.name)}`} className="sm:col-span-2">
                  <Input id="p-slug" value={product.slug} placeholder={slugify(product.name)} onChange={(e) => set({ slug: slugify(e.target.value) })} />
                </Field>
                <Field label={p.shortSw} htmlFor="p-ssw">
                  <Input id="p-ssw" value={product.shortDescription.sw} onChange={(e) => set({ shortDescription: { ...product.shortDescription, sw: e.target.value } })} />
                </Field>
                <Field label={p.shortEn} htmlFor="p-sen">
                  <Input id="p-sen" value={product.shortDescription.en} onChange={(e) => set({ shortDescription: { ...product.shortDescription, en: e.target.value } })} />
                </Field>
                <Field label={p.descSw} htmlFor="p-dsw">
                  <Textarea id="p-dsw" value={product.description.sw} onChange={(e) => set({ description: { ...product.description, sw: e.target.value } })} />
                </Field>
                <Field label={p.descEn} htmlFor="p-den">
                  <Textarea id="p-den" value={product.description.en} onChange={(e) => set({ description: { ...product.description, en: e.target.value } })} />
                </Field>
                <div className="sm:col-span-2">
                  <Label>{p.highlights}</Label>
                  <div className="mt-2 space-y-2">
                    {product.highlights.map((h, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                        <Input placeholder="SW" value={h.sw} onChange={(e) => set({ highlights: product.highlights.map((x, j) => (j === i ? { ...x, sw: e.target.value } : x)) })} />
                        <Input placeholder="EN" value={h.en} onChange={(e) => set({ highlights: product.highlights.map((x, j) => (j === i ? { ...x, en: e.target.value } : x)) })} />
                        <Button variant="ghost" size="icon" onClick={() => set({ highlights: product.highlights.filter((_, j) => j !== i) })} aria-label={t.admin.common.delete}>
                          <X />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => set({ highlights: [...product.highlights, { sw: "", en: "" }] })}>
                      <Plus />
                      {t.admin.common.add}
                    </Button>
                  </div>
                </div>
              </div>
            </Panel>
            <div className="space-y-6">
              <Panel>
                <div className="grid gap-4">
                  <Field label={p.category} htmlFor="p-cat">
                    <NativeSelect id="p-cat" value={product.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name[locale]}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field label={p.brand} htmlFor="p-brand">
                    <NativeSelect id="p-brand" value={brandId} onChange={(e) => set({ brandId: e.target.value })}>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field label={p.condition}>
                    <div className="grid grid-cols-2 gap-2">
                      {(["new", "used"] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => set({ condition: c, grade: c === "used" ? product.grade ?? "A" : undefined, batteryHealth: c === "used" ? product.batteryHealth ?? 90 : undefined, warrantyMonths: c === "used" ? 6 : 12 })}
                          className={cn("rounded-xl border px-3 py-2.5 text-sm font-medium", product.condition === c ? "border-primary bg-primary-soft/60 ring-1 ring-primary" : "border-border")}
                        >
                          {c === "new" ? t.common.product.new : t.common.product.used}
                        </button>
                      ))}
                    </div>
                  </Field>
                  {product.condition === "used" && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={p.grade} htmlFor="p-grade">
                        <NativeSelect id="p-grade" value={product.grade} onChange={(e) => set({ grade: e.target.value as Product["grade"] })}>
                          {(["A", "B", "C"] as const).map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </NativeSelect>
                      </Field>
                      <Field label={p.battery} htmlFor="p-batt">
                        <Input id="p-batt" type="number" min={50} max={100} value={product.batteryHealth ?? ""} onChange={(e) => set({ batteryHealth: Number(e.target.value) })} />
                      </Field>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={p.warranty} htmlFor="p-war">
                      <Input id="p-war" type="number" value={product.warrantyMonths} onChange={(e) => set({ warrantyMonths: Number(e.target.value) })} />
                    </Field>
                    <Field label={p.lowStockThreshold} htmlFor="p-low">
                      <Input id="p-low" type="number" value={product.lowStockThreshold} onChange={(e) => set({ lowStockThreshold: Number(e.target.value) })} />
                    </Field>
                  </div>
                </div>
              </Panel>
              <Panel title={p.tags}>
                <div className="flex flex-wrap gap-2">
                  {TAGS.map((tag) => {
                    const on = product.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => set({ tags: on ? product.tags.filter((x) => x !== tag) : [...product.tags, tag] })}
                        className={cn("rounded-full border px-3 py-1.5 text-xs font-medium capitalize", on ? "border-primary bg-primary text-white" : "border-border")}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </Panel>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="variants">
          <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
            <div className="space-y-6">
              <Panel title={p.colors}>
                <div className="space-y-2">
                  {product.colors.map((c, i) => (
                    <div key={i} className="grid grid-cols-[44px_1fr_1fr_auto] items-center gap-2">
                      <input type="color" value={c.hex} onChange={(e) => updateColor(i, { hex: e.target.value })} className="h-10 w-11 cursor-pointer rounded-lg border border-input p-0.5" aria-label={p.colorName} />
                      <Input className="h-10" placeholder="SW" value={c.name.sw} onChange={(e) => updateColor(i, { name: { ...c.name, sw: e.target.value } })} />
                      <Input className="h-10" placeholder="EN" value={c.name.en} onChange={(e) => updateColor(i, { name: { ...c.name, en: e.target.value } })} />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={product.colors.length === 1}
                        onClick={() => set({ colors: product.colors.filter((_, j) => j !== i), variants: product.variants.filter((v) => v.color !== c.hex) })}
                        aria-label={t.admin.common.delete}
                      >
                        <X />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => set({ colors: [...product.colors, { name: { sw: "", en: "" }, hex: "#9ca3af" }] })}>
                    <Plus />
                    {p.addColor}
                  </Button>
                </div>
              </Panel>
              {isPhone && (
                <Panel title={`${p.storages} · ${p.rams}`}>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {[...new Set([...storageOptions, ...product.storages])].map((s) => {
                        const on = product.storages.includes(s);
                        return (
                          <label key={s} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm", on ? "border-primary bg-primary-soft/50" : "border-border")}>
                            <Checkbox checked={on} onCheckedChange={(v) => set({ storages: v ? [...product.storages, s] : product.storages.filter((x) => x !== s) })} />
                            {s}
                          </label>
                        );
                      })}
                      <form
                        className="flex gap-1"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (newStorage.trim()) set({ storages: [...product.storages, newStorage.trim().toUpperCase()] });
                          setNewStorage("");
                        }}
                      >
                        <Input className="h-9 w-24" placeholder="2TB" value={newStorage} onChange={(e) => setNewStorage(e.target.value)} />
                      </form>
                    </div>
                    <Field label={p.rams} htmlFor="p-ram">
                      <NativeSelect id="p-ram" value={product.rams[0] ?? ""} onChange={(e) => set({ rams: [e.target.value], variants: product.variants.map((v) => ({ ...v, ram: e.target.value })) })}>
                        {ramOptions.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </NativeSelect>
                    </Field>
                  </div>
                </Panel>
              )}
              <Button variant="secondary" className="w-full" onClick={generateVariants}>
                <Sparkles />
                {p.generateVariants}
              </Button>
            </div>
            <Panel title={p.tabs.variants}>
              {errors.variants && <p className="mb-3 text-sm text-destructive">{errors.variants}</p>}
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-2 pb-2 font-medium">{t.admin.inventory.variant}</th>
                      <th className="px-2 pb-2 font-medium">{p.sku}</th>
                      <th className="px-2 pb-2 font-medium">{p.price}</th>
                      <th className="px-2 pb-2 font-medium">{p.compareAt}</th>
                      <th className="px-2 pb-2 font-medium">{p.stock}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {product.variants.map((v) => {
                      const color = product.colors.find((c) => c.hex === v.color);
                      return (
                        <tr key={v.id}>
                          <td className="px-2 py-2">
                            <span className="flex items-center gap-2 whitespace-nowrap">
                              <span className="size-4 rounded-full border border-border" style={{ background: v.color }} />
                              {color?.name[locale]} {v.storage && `· ${v.storage}`}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            <Input className="h-9 w-36 font-mono text-xs" value={v.sku} placeholder="AUTO" onChange={(e) => updateVariant(v.id, { sku: e.target.value })} />
                          </td>
                          <td className="px-2 py-2">
                            <Input className="h-9 w-32" type="number" value={v.price || ""} onChange={(e) => updateVariant(v.id, { price: Number(e.target.value) })} aria-invalid={!(v.price > 0)} />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              className="h-9 w-32"
                              type="number"
                              value={v.compareAtPrice ?? ""}
                              onChange={(e) => updateVariant(v.id, { compareAtPrice: e.target.value ? Number(e.target.value) : undefined })}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input className="h-9 w-20" type="number" value={v.stock} onChange={(e) => updateVariant(v.id, { stock: Number(e.target.value) })} />
                          </td>
                          <td className="px-2 py-2">
                            <Button variant="ghost" size="icon-sm" onClick={() => set({ variants: product.variants.filter((x) => x.id !== v.id) })} aria-label={t.admin.common.delete}>
                              <Trash2 />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                {t.common.product.from} {formatTZS(Math.min(...product.variants.map((v) => v.price || Infinity)) || 0)}
              </p>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="specs">
          <div className="space-y-4">
            {product.specs.map((g, gi) => (
              <Panel key={gi}>
                <div className="mb-3 grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input placeholder={`${p.specGroup} (SW)`} value={g.group.sw} onChange={(e) => set({ specs: product.specs.map((x, j) => (j === gi ? { ...x, group: { ...x.group, sw: e.target.value } } : x)) })} />
                  <Input placeholder={`${p.specGroup} (EN)`} value={g.group.en} onChange={(e) => set({ specs: product.specs.map((x, j) => (j === gi ? { ...x, group: { ...x.group, en: e.target.value } } : x)) })} />
                  <Button variant="ghost" size="icon" onClick={() => set({ specs: product.specs.filter((_, j) => j !== gi) })} aria-label={t.admin.common.delete}>
                    <Trash2 />
                  </Button>
                </div>
                <div className="space-y-2">
                  {g.items.map((it, ii) => {
                    const setItem = (patch: Partial<typeof it>) =>
                      set({ specs: product.specs.map((x, j) => (j === gi ? { ...x, items: x.items.map((y, k) => (k === ii ? { ...y, ...patch } : y)) } : x)) });
                    return (
                      <div key={ii} className="grid grid-cols-[1fr_1fr_1.4fr_auto] gap-2">
                        <Input className="h-9" placeholder={`${p.specLabel} (SW)`} value={it.label.sw} onChange={(e) => setItem({ label: { ...it.label, sw: e.target.value } })} />
                        <Input className="h-9" placeholder={`${p.specLabel} (EN)`} value={it.label.en} onChange={(e) => setItem({ label: { ...it.label, en: e.target.value } })} />
                        <Input className="h-9" placeholder={p.specValue} value={it.value} onChange={(e) => setItem({ value: e.target.value })} />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => set({ specs: product.specs.map((x, j) => (j === gi ? { ...x, items: x.items.filter((_, k) => k !== ii) } : x)) })}
                          aria-label={t.admin.common.delete}
                        >
                          <X />
                        </Button>
                      </div>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => set({ specs: product.specs.map((x, j) => (j === gi ? { ...x, items: [...x.items, { label: { sw: "", en: "" }, value: "" }] } : x)) })}
                  >
                    <Plus />
                    {p.addSpec}
                  </Button>
                </div>
              </Panel>
            ))}
            <Button variant="secondary" onClick={() => set({ specs: [...product.specs, { group: { sw: "", en: "" }, items: [{ label: { sw: "", en: "" }, value: "" }] }] })}>
              <Plus />
              {p.addSpecGroup}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="media">
          <Panel>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/40 px-6 py-12 text-center transition hover:border-primary/50 hover:bg-primary-soft/20">
              <ImagePlus className="size-10 text-primary" />
              <p className="mt-3 max-w-md text-sm text-muted-foreground">{p.mediaHint}</p>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []).filter((f) => f.size <= 5 * 1024 * 1024);
                  e.target.value = "";
                  if (!files.length) return;
                  setUploading(true);
                  try {
                    const urls = await Promise.all(files.map((f) => uploadImage(f, "products")));
                    setProduct((cur) => ({ ...cur, images: [...cur.images, ...urls] }));
                  } catch (err) {
                    toast.error(apiErrorMessage(err, t));
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
            {product.images.length > 0 ? (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {product.images.map((src, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element -- uploaded photo served from the API's storage */}
                    <img src={src} alt="" className="size-full object-cover" />
                    <button
                      onClick={() => set({ images: product.images.filter((_, j) => j !== i) })}
                      className="absolute top-1.5 right-1.5 hidden rounded-full bg-black/70 p-1 text-white group-hover:block"
                      aria-label={t.admin.common.delete}
                    >
                      <X className="size-3.5" />
                    </button>
                    {i === 0 && <Badge className="absolute bottom-1.5 left-1.5">Cover</Badge>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-center text-xs text-muted-foreground">{p.mediaFallback}</p>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="seo">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel>
              <div className="grid gap-4">
                <Field label={p.seoTitle} htmlFor="seo-t" hint={`${(product.seo.title || product.name).length}/60`}>
                  <Input id="seo-t" value={product.seo.title} placeholder={`${product.name} | Joh Shopping`} onChange={(e) => set({ seo: { ...product.seo, title: e.target.value } })} />
                </Field>
                <Field label={p.seoDesc} htmlFor="seo-d" hint={`${product.seo.description.length}/160`}>
                  <Textarea id="seo-d" value={product.seo.description} onChange={(e) => set({ seo: { ...product.seo, description: e.target.value } })} />
                </Field>
              </div>
            </Panel>
            <Panel title={p.seoPreview}>
              <div className="rounded-xl border border-border bg-white p-4 dark:bg-neutral-900">
                <p className="text-xs text-[#1a7f37]">johshopping.co.tz › products › {product.slug || slugify(product.name)}</p>
                <p className="mt-1 text-lg text-[#1a0dab] dark:text-[#8ab4f8]">{product.seo.title || `${product.name} | Joh Shopping`}</p>
                <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{product.seo.description || product.shortDescription.en}</p>
              </div>
            </Panel>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
