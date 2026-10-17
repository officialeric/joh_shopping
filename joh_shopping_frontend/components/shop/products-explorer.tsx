"use client";

import { ArrowRight, Check, LayoutGrid, List, PackageSearch, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Banner, Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/feedback";
import { Link } from "@/components/ui/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/overlays";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Rating, Slider } from "@/components/ui/primitives";
import { CategoryIcon } from "@/components/brand/icons";
import type { ProductQuery, SortKey } from "@/lib/data/catalog";
import { useShop } from "@/lib/data/shop-context";
import { useT } from "@/lib/i18n/client";
import { cn, fmt, formatTZS } from "@/lib/utils";
import { BannerVisual } from "./banner-visual";
import { ProductCard, ProductImage } from "./product-card";
import { Price } from "./price";
import { useProductActions } from "./product-actions";

const PAGE_SIZE = 12;
const PRICE_MAX = 5_000_000;
const SORTS: SortKey[] = ["featured", "newest", "popular", "price-asc", "price-desc", "rating"];

function parseQuery(sp: URLSearchParams): ProductQuery & { page: number; view: "grid" | "list" } {
  const list = (k: string) => sp.get(k)?.split(",").filter(Boolean) ?? [];
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);
  return {
    q: sp.get("q") ?? undefined,
    category: sp.get("category") ?? undefined,
    brand: list("brand"),
    condition: list("condition"),
    storage: list("storage"),
    ram: list("ram"),
    color: list("color"),
    minPrice: num("minPrice"),
    maxPrice: num("maxPrice"),
    rating: num("rating"),
    inStock: sp.get("inStock") === "1",
    deals: sp.get("deals") === "1",
    sort: (sp.get("sort") as SortKey) ?? "featured",
    page: Number(sp.get("page") ?? 1),
    view: sp.get("view") === "list" ? "list" : "grid",
  };
}

export function ProductsExplorer() {
  const { t, locale } = useT();
  const { allColors, banners, brands, categories, getBrand, getCategoryBySlug, queryProducts } = useShop();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const query = useMemo(() => parseQuery(new URLSearchParams(sp.toString())), [sp]);
  const results = useMemo(() => queryProducts(query), [query, queryProducts]);
  const visible = results.slice(0, query.page * PAGE_SIZE);
  const category = query.category ? getCategoryBySlug(query.category) : undefined;

  const update = (patch: Record<string, string | string[] | undefined | null>, keepPage = false) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      const value = Array.isArray(v) ? v.join(",") : v;
      if (value == null || value === "") next.delete(k);
      else next.set(k, value);
    }
    if (!keepPage) next.delete("page");
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const toggleIn = (key: "brand" | "condition" | "storage" | "ram" | "color", value: string) => {
    const current = query[key] ?? [];
    update({ [key]: current.includes(value) ? current.filter((x) => x !== value) : [...current, value] });
  };

  const chips: { label: string; clear: () => void }[] = [];
  if (query.q) chips.push({ label: `“${query.q}”`, clear: () => update({ q: null }) });
  query.brand?.forEach((b) => chips.push({ label: getBrand(brands.find((x) => x.slug === b)?.id ?? "")?.name ?? b, clear: () => toggleIn("brand", b) }));
  query.condition?.forEach((c) => chips.push({ label: c === "new" ? t.common.product.new : t.common.product.used, clear: () => toggleIn("condition", c) }));
  query.storage?.forEach((s) => chips.push({ label: s, clear: () => toggleIn("storage", s) }));
  query.ram?.forEach((s) => chips.push({ label: `${s} RAM`, clear: () => toggleIn("ram", s) }));
  query.color?.forEach((c) => chips.push({ label: allColors.find((x) => x.name.en.toLowerCase() === c)?.name[locale] ?? c, clear: () => toggleIn("color", c) }));
  if (query.minPrice != null || query.maxPrice != null)
    chips.push({
      label: `${formatTZS(query.minPrice ?? 0, { compact: true })} – ${query.maxPrice ? formatTZS(query.maxPrice, { compact: true }) : "∞"}`,
      clear: () => update({ minPrice: null, maxPrice: null }),
    });
  if (query.rating) chips.push({ label: `${query.rating}★+`, clear: () => update({ rating: null }) });
  if (query.inStock) chips.push({ label: t.shop.listing.inStockOnly, clear: () => update({ inStock: null }) });
  if (query.deals) chips.push({ label: t.shop.listing.dealsOnly, clear: () => update({ deals: null }) });

  const clearAll = () => startTransition(() => router.replace(category ? `${pathname}?category=${category.slug}` : pathname, { scroll: false }));
  const title = query.q ? fmt(t.shop.listing.searchResults, { q: query.q }) : category ? category.name[locale] : t.shop.listing.allProducts;

  const filters = <Filters query={query} update={update} toggleIn={toggleIn} />;

  // Admin → Banners with placement "category": the one linking to this category, or the first on the unfiltered listing.
  const categoryBanners = banners.filter((b) => b.placement === "category").sort((a, b) => a.sortOrder - b.sortOrder);
  const banner = query.q ? undefined : category ? categoryBanners.find((b) => b.href.includes(`category=${category.slug}`)) : chips.length === 0 ? categoryBanners[0] : undefined;

  return (
    <div>
      <div className="border-b border-border bg-card">
        <div className="container-page py-8 sm:py-10">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-foreground">
              {t.shop.productPage.breadcrumbHome}
            </Link>
            <span>/</span>
            <Link href="/products" className="hover:text-foreground">
              {t.common.nav.products}
            </Link>
            {category && (
              <>
                <span>/</span>
                <span className="text-foreground">{category.name[locale]}</span>
              </>
            )}
          </nav>
          <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
          <p className="mt-2 text-muted-foreground">
            {category ? category.description[locale] : fmt(t.shop.listing.found, { n: results.length })}
          </p>
          <div className="scrollbar-none -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => update({ category: null })}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition",
                !category ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/30",
              )}
            >
              {t.common.misc.all}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => update({ category: c.slug })}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                  category?.id === c.id ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/30",
                )}
              >
                <CategoryIcon name={c.icon} className="size-4" />
                {c.name[locale]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-page grid gap-8 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">{filters}</div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal />
                  {t.common.actions.filters}
                  {chips.length > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] text-white">{chips.length}</span>}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" heading={t.common.actions.filters}>
                <div className="flex-1 overflow-y-auto px-5 py-2">{filters}</div>
                <div className="grid grid-cols-2 gap-2 border-t border-border p-4">
                  <Button variant="outline" onClick={clearAll}>
                    {t.common.actions.clearAll}
                  </Button>
                  <SheetTrigger asChild>
                    <Button>{fmt(t.shop.listing.showProducts, { n: results.length })}</Button>
                  </SheetTrigger>
                </div>
              </SheetContent>
            </Sheet>
            <p className="hidden text-sm text-muted-foreground sm:block">{fmt(t.shop.listing.found, { n: results.length })}</p>
            <div className="ml-auto flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <span className="hidden text-muted-foreground sm:inline">{t.shop.listing.sortBy}:</span>
                    {t.shop.listing.sort[query.sort ?? "featured"]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup value={query.sort} onValueChange={(v) => update({ sort: v === "featured" ? null : v })}>
                    {SORTS.map((s) => (
                      <DropdownMenuRadioItem key={s} value={s}>
                        {t.shop.listing.sort[s]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="hidden rounded-full border border-border bg-card p-1 sm:flex">
                {(["grid", "list"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => update({ view: v === "grid" ? null : v }, true)}
                    className={cn("flex size-8 items-center justify-center rounded-full transition", query.view === v ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground")}
                    aria-label={v === "grid" ? t.shop.listing.gridView : t.shop.listing.listView}
                    aria-pressed={query.view === v}
                  >
                    {v === "grid" ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <button
                  key={c.label}
                  onClick={c.clear}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary-soft-foreground transition hover:bg-brand-100 dark:hover:bg-brand-950"
                >
                  {c.label}
                  <X className="size-3.5" />
                </button>
              ))}
              <button onClick={clearAll} className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                {t.common.actions.clearAll}
              </button>
            </div>
          )}

          {banner && <CategoryBanner banner={banner} />}

          {results.length === 0 ? (
            <EmptyState
              icon={<PackageSearch />}
              title={t.common.misc.noResults}
              description={t.common.misc.noResultsDesc}
              action={<Button onClick={clearAll}>{t.common.actions.clearAll}</Button>}
              className="rounded-3xl border border-dashed border-border"
            />
          ) : query.view === "list" ? (
            <div className="grid gap-3">
              {visible.map((p) => (
                <ProductRow key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {visible.length < results.length && (
            <div className="mt-10 flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {fmt(t.common.misc.showing, { from: 1, to: visible.length, total: results.length })}
              </p>
              <Button variant="outline" size="lg" onClick={() => update({ page: String(query.page + 1) }, true)}>
                {t.common.actions.loadMore}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ value, title, children }: { value: string; title: string; children: React.ReactNode }) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="py-3.5 text-sm font-semibold">{title}</AccordionTrigger>
      <AccordionContent className="text-foreground">{children}</AccordionContent>
    </AccordionItem>
  );
}

function CheckRow({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="flex flex-1 cursor-pointer items-center justify-between font-normal">
        {children}
      </Label>
    </div>
  );
}

function Filters({
  query,
  update,
  toggleIn,
}: {
  query: ProductQuery;
  update: (patch: Record<string, string | null>) => void;
  toggleIn: (key: "brand" | "condition" | "storage" | "ram" | "color", value: string) => void;
}) {
  const { allColors, allRams, allStorages, brands } = useShop();
  const { t, locale } = useT();
  const [price, setPrice] = useState<[number, number]>([query.minPrice ?? 0, query.maxPrice ?? PRICE_MAX]);
  const commitPrice = (v: [number, number]) =>
    update({ minPrice: v[0] > 0 ? String(v[0]) : null, maxPrice: v[1] < PRICE_MAX ? String(v[1]) : null });

  return (
    <Accordion type="multiple" defaultValue={["condition", "brand", "price", "storage"]}>
      <FilterGroup value="condition" title={t.common.product.condition}>
        {(["new", "used"] as const).map((c) => (
          <CheckRow key={c} id={`cond-${c}`} checked={!!query.condition?.includes(c)} onChange={() => toggleIn("condition", c)}>
            {c === "new" ? t.common.product.new : t.common.product.used}
          </CheckRow>
        ))}
      </FilterGroup>
      <FilterGroup value="brand" title={t.common.product.brand}>
        {brands.map((b) => (
          <CheckRow key={b.id} id={`brand-${b.slug}`} checked={!!query.brand?.includes(b.slug)} onChange={() => toggleIn("brand", b.slug)}>
            <span>{b.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{b.productCount}</span>
          </CheckRow>
        ))}
      </FilterGroup>
      <FilterGroup value="price" title={t.shop.listing.price}>
        <div className="space-y-4 pt-2">
          <Slider min={0} max={PRICE_MAX} step={50_000} value={price} onValueChange={(v) => setPrice(v as [number, number])} onValueCommit={(v) => commitPrice(v as [number, number])} />
          <div className="flex items-center gap-2">
            <Input
              aria-label={t.shop.listing.min}
              inputMode="numeric"
              className="h-9 text-xs"
              value={price[0].toLocaleString("en-US")}
              onChange={(e) => setPrice([Number(e.target.value.replace(/\D/g, "")) || 0, price[1]])}
              onBlur={() => commitPrice(price)}
            />
            <span className="text-muted-foreground">–</span>
            <Input
              aria-label={t.shop.listing.max}
              inputMode="numeric"
              className="h-9 text-xs"
              value={price[1].toLocaleString("en-US")}
              onChange={(e) => setPrice([price[0], Number(e.target.value.replace(/\D/g, "")) || 0])}
              onBlur={() => commitPrice(price)}
            />
          </div>
        </div>
      </FilterGroup>
      <FilterGroup value="storage" title={t.common.product.storage}>
        <div className="flex flex-wrap gap-2 pt-1">
          {allStorages.map((s) => (
            <button
              key={s}
              onClick={() => toggleIn("storage", s)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                query.storage?.includes(s) ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border hover:border-foreground/30",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup value="ram" title={t.common.product.ram}>
        <div className="flex flex-wrap gap-2 pt-1">
          {allRams.map((s) => (
            <button
              key={s}
              onClick={() => toggleIn("ram", s)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                query.ram?.includes(s) ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border hover:border-foreground/30",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup value="color" title={t.common.product.color}>
        <div className="flex flex-wrap gap-2.5 pt-1">
          {allColors.map((c) => {
            const key = c.name.en.toLowerCase();
            const active = !!query.color?.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleIn("color", key)}
                className={cn("relative size-8 rounded-full border border-border ring-offset-2 ring-offset-background transition", active && "ring-2 ring-primary")}
                style={{ background: c.hex }}
                title={c.name[locale]}
                aria-label={c.name[locale]}
                aria-pressed={active}
              >
                {active && <Check className="absolute inset-0 m-auto size-4 text-white mix-blend-difference" />}
              </button>
            );
          })}
        </div>
      </FilterGroup>
      <FilterGroup value="rating" title={t.common.product.rating}>
        {[4.5, 4, 3].map((r) => (
          <button
            key={r}
            onClick={() => update({ rating: query.rating === r ? null : String(r) })}
            className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-accent", query.rating === r && "bg-primary-soft")}
          >
            <Rating value={r} />
            <span className="text-muted-foreground">{fmt(t.shop.listing.ratingAndUp, { n: r })}</span>
          </button>
        ))}
      </FilterGroup>
      <FilterGroup value="availability" title={t.shop.listing.availability}>
        <CheckRow id="in-stock" checked={!!query.inStock} onChange={() => update({ inStock: query.inStock ? null : "1" })}>
          {t.shop.listing.inStockOnly}
        </CheckRow>
        <CheckRow id="deals" checked={!!query.deals} onChange={() => update({ deals: query.deals ? null : "1" })}>
          {t.shop.listing.dealsOnly}
        </CheckRow>
      </FilterGroup>
    </Accordion>
  );
}

function ProductRow({ product }: { product: Product }) {
  const { getBrand } = useShop();
  const { t, locale } = useT();
  const actions = useProductActions();
  return (
    <article className="group grid grid-cols-[120px_1fr] gap-4 rounded-2xl border border-border bg-card p-3 transition hover:shadow-lift sm:grid-cols-[180px_1fr_auto] sm:p-4">
      <Link href={`/products/${product.slug}`} className="aspect-square rounded-xl bg-surface p-2">
        <ProductImage product={product} className="transition-transform duration-500 group-hover:scale-105" />
      </Link>
      <div className="min-w-0 py-1">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{getBrand(product.brandId)?.name}</p>
        <Link href={`/products/${product.slug}`} className="mt-1 block font-medium hover:text-primary sm:text-lg">
          {product.name}
        </Link>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Rating value={product.rating} size="xs" />
          {fmt(t.common.product.reviewsCount, { n: product.reviewCount })}
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{product.shortDescription[locale]}</p>
        <ul className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
          {product.highlights.slice(0, 3).map((h) => (
            <li key={h.en} className="rounded-full bg-muted px-2.5 py-1 text-xs">
              {h[locale]}
            </li>
          ))}
        </ul>
        <div className="mt-3 sm:hidden">
          <Price price={product.price} compareAt={product.compareAtPrice} />
        </div>
      </div>
      <div className="hidden flex-col items-end justify-between py-1 sm:flex">
        <Price price={product.price} compareAt={product.compareAtPrice} size="lg" showBadge className="flex-col items-end" />
        <Button onClick={() => actions.addToCart(product)}>{t.common.actions.addToCart}</Button>
      </div>
    </article>
  );
}

const BANNER_THEMES = {
  dark: "bg-neutral-950 text-white",
  red: "bg-brand-gradient text-white",
  light: "bg-surface text-foreground",
};

/** A slim promo above the results. Hidden on phones so products come first. */
function CategoryBanner({ banner }: { banner: Banner }) {
  const { locale } = useT();
  const light = banner.theme === "light";
  return (
    <Link href={banner.href} className={cn("group relative mb-6 hidden h-40 items-center overflow-hidden rounded-3xl px-8 md:flex", BANNER_THEMES[banner.theme])}>
      <div className="relative z-10 max-w-[60%]">
        <p className="font-display text-2xl font-semibold">{banner.title[locale]}</p>
        <p className={cn("mt-1 line-clamp-2 text-sm", light ? "text-muted-foreground" : "text-white/75")}>{banner.subtitle[locale]}</p>
        <span className={cn("mt-3 inline-flex items-center gap-1.5 text-sm font-semibold", light && "text-primary")}>
          {banner.cta[locale]}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
      <div className="absolute right-6 -bottom-6 aspect-square h-[130%] transition-transform duration-700 group-hover:scale-105 group-hover:-rotate-3">
        <BannerVisual banner={banner} />
      </div>
    </Link>
  );
}
