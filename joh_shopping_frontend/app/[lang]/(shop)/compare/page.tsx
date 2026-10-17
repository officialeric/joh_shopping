"use client";

import { GitCompare, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox, Label, NativeSelect } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/feedback";
import { Link } from "@/components/ui/link";
import { Rating, Skeleton } from "@/components/ui/primitives";
import { PageHero } from "@/components/shop/page-hero";
import { ProductImage } from "@/components/shop/product-card";
import { Price } from "@/components/shop/price";
import { useProductActions } from "@/components/shop/product-actions";
import { useShop } from "@/lib/data/shop-context";
import { useT } from "@/lib/i18n/client";
import { cn, fmt } from "@/lib/utils";
import { COMPARE_LIMIT, useCompare, useHydrated } from "@/stores";

export default function ComparePage() {
  const { getBrand, getProduct, products } = useShop();
  const { t, locale } = useT();
  const hydrated = useHydrated();
  const ids = useCompare((s) => s.ids);
  const toggle = useCompare((s) => s.toggle);
  const remove = useCompare((s) => s.remove);
  const actions = useProductActions();
  const [diffOnly, setDiffOnly] = useState(false);
  const list = ids.map((id) => getProduct(id)).filter((p): p is Product => !!p);

  const rows = useMemo(() => {
    const groups = new Map<string, { label: string; rows: Map<string, { label: string; values: string[] }> }>();
    list.forEach((p, pi) => {
      for (const g of p.specs) {
        if (!groups.has(g.group.en)) groups.set(g.group.en, { label: g.group[locale], rows: new Map() });
        const group = groups.get(g.group.en)!;
        for (const item of g.items) {
          if (!group.rows.has(item.label.en)) group.rows.set(item.label.en, { label: item.label[locale], values: Array(list.length).fill("—") });
          group.rows.get(item.label.en)!.values[pi] = item.value;
        }
      }
    });
    return [...groups.values()].map((g) => ({
      label: g.label,
      rows: [...g.rows.values()].filter((r) => !diffOnly || new Set(r.values).size > 1),
    }));
  }, [list, locale, diffOnly]);

  const candidates = products.filter((p) => !ids.includes(p.id));
  const cols = `minmax(140px,180px) repeat(${Math.max(list.length, 1)}, minmax(200px,1fr))`;

  return (
    <>
      <PageHero title={t.common.compare.title} subtitle={t.common.compare.subtitle} />
      <div className="container-page py-10">
        {!hydrated ? (
          <Skeleton className="h-96" />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<GitCompare />}
            title={t.common.compare.empty}
            description={t.common.compare.emptyDesc}
            action={
              <Button asChild>
                <Link href="/products?category=smartphones">{t.common.actions.shopNow}</Link>
              </Button>
            }
            className="rounded-[28px] border border-dashed border-border"
          />
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Checkbox id="diff" checked={diffOnly} onCheckedChange={(v) => setDiffOnly(!!v)} />
                <Label htmlFor="diff" className="font-normal">
                  {t.common.compare.highlightDiff}
                </Label>
              </div>
              {list.length < COMPARE_LIMIT && (
                <div className="flex items-center gap-2">
                  <Plus className="size-4 text-muted-foreground" />
                  <NativeSelect className="h-10 w-64" value="" onChange={(e) => e.target.value && toggle(e.target.value)} aria-label={t.common.compare.addProduct}>
                    <option value="">{t.common.compare.addProduct}</option>
                    {candidates.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              )}
            </div>
            <div className="overflow-x-auto rounded-[24px] border border-border bg-card">
              <div className="min-w-fit">
                <div className="grid border-b border-border" style={{ gridTemplateColumns: cols }}>
                  <div className="p-5" />
                  {list.map((p) => (
                    <div key={p.id} className="relative border-l border-border p-5">
                      <button onClick={() => remove(p.id)} className="absolute top-3 right-3 rounded-full p-1.5 text-muted-foreground hover:bg-accent" aria-label={t.common.actions.remove}>
                        <X className="size-4" />
                      </button>
                      <Link href={`/products/${p.slug}`} className="block">
                        <div className="mx-auto aspect-square w-36 rounded-2xl bg-surface p-3">
                          <ProductImage product={p} view={p.art.kind === "phone" ? "back" : undefined} />
                        </div>
                        <p className="mt-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{getBrand(p.brandId)?.name}</p>
                        <p className="font-semibold hover:text-primary">{p.name}</p>
                      </Link>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Rating value={p.rating} size="xs" />
                        {fmt(t.common.product.reviewsCount, { n: p.reviewCount })}
                      </div>
                      <Price price={p.price} compareAt={p.compareAtPrice} className="mt-2" />
                      <Button size="sm" className="mt-4 w-full" onClick={() => actions.addToCart(p)}>
                        {t.common.actions.addToCart}
                      </Button>
                    </div>
                  ))}
                </div>
                <Row cols={cols} label={t.common.product.condition} values={list.map((p) => (p.condition === "new" ? t.common.product.new : `${t.common.product.used} · ${p.grade}`))} />
                <Row cols={cols} label={t.common.product.warrantyShort} values={list.map((p) => fmt(t.common.product.warranty, { n: p.warrantyMonths }))} />
                {rows.map((g) =>
                  g.rows.length === 0 ? null : (
                    <div key={g.label}>
                      <div className="border-b border-border bg-muted/60 px-5 py-2.5 text-xs font-semibold tracking-wider uppercase">{g.label}</div>
                      {g.rows.map((r) => (
                        <Row key={r.label} cols={cols} label={r.label} values={r.values} highlight={new Set(r.values).size > 1} />
                      ))}
                    </div>
                  ),
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Row({ cols, label, values, highlight }: { cols: string; label: string; values: string[]; highlight?: boolean }) {
  return (
    <div className="grid border-b border-border text-sm last:border-b-0" style={{ gridTemplateColumns: cols }}>
      <div className="px-5 py-3 text-muted-foreground">{label}</div>
      {values.map((v, i) => (
        <div key={i} className={cn("border-l border-border px-5 py-3 font-medium", highlight && "bg-primary-soft/30")}>
          {v}
        </div>
      ))}
    </div>
  );
}
