"use client";

import { ArrowRight, Flame } from "lucide-react";
import type { FlashSale, Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Progress, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { useShop } from "@/lib/data/shop-context";
import { useT } from "@/lib/i18n/client";
import { discountPercent, fmt, formatTZS } from "@/lib/utils";
import { Countdown } from "./countdown";
import { ProductGrid, ProductImage } from "./product-card";
import { useProductActions } from "./product-actions";

export function FlashSaleSection({ sale }: { sale: FlashSale }) {
  const { getProduct } = useShop();
  const { t, locale } = useT();
  const actions = useProductActions();
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-neutral-950 p-6 text-white sm:p-10">
      <div className="absolute inset-0 bg-[radial-gradient(50%_60%_at_0%_0%,rgba(238,47,66,0.4),transparent_70%)]" />
      <div className="relative mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-brand-300 uppercase">
            <Flame className="size-4" />
            {t.shop.home.flashEyebrow}
          </p>
          <h2 className="text-3xl font-semibold sm:text-4xl">{sale.name[locale]}</h2>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="text-xs text-white/60">{t.common.misc.endsIn}</span>
          <Countdown endsAt={sale.endsAt} variant="dark" cycleMs={3 * 86_400_000} />
        </div>
      </div>
      <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sale.items.map((item) => {
          const product = getProduct(item.productId);
          if (!product) return null;
          const original = product.compareAtPrice ?? product.price;
          const pct = (item.sold / item.quantity) * 100;
          return (
            <div key={item.productId} className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur transition hover:bg-white/[0.07]">
              <Link href={`/products/${product.slug}`} className="relative mb-3 block aspect-[4/3]">
                <span className="absolute top-0 left-0 z-10 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold">
                  -{discountPercent(item.salePrice, original)}%
                </span>
                <ProductImage product={product} className="transition-transform duration-500 group-hover:scale-105" />
              </Link>
              <Link href={`/products/${product.slug}`} className="line-clamp-1 text-sm font-medium hover:text-brand-300">
                {product.name}
              </Link>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-lg font-semibold">{formatTZS(item.salePrice)}</span>
                <span className="text-xs text-white/50 line-through">{formatTZS(original)}</span>
              </div>
              <div className="mt-3 space-y-1.5">
                <Progress value={pct} className="h-1.5 bg-white/10" />
                <p className="text-[11px] text-white/60">{fmt(t.shop.home.flashSold, { sold: item.sold, total: item.quantity })}</p>
              </div>
              <Button size="sm" className="mt-4" onClick={() => actions.addToCart(product)}>
                {t.common.actions.addToCart}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function TrendingTabs({ featured, fresh, best, deals }: { featured: Product[]; fresh: Product[]; best: Product[]; deals: Product[] }) {
  const { t } = useT();
  const tabs = [
    { value: "featured", label: t.shop.home.tabFeatured, items: featured },
    { value: "new", label: t.shop.home.tabNew, items: fresh },
    { value: "best", label: t.shop.home.tabBest, items: best },
    { value: "deals", label: t.shop.home.tabDeals, items: deals },
  ];
  return (
    <Tabs defaultValue="featured">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-primary uppercase">{t.shop.home.trendingEyebrow}</p>
          <h2 className="text-2xl font-semibold sm:text-3xl">{t.shop.home.trendingTitle}</h2>
        </div>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          <ProductGrid products={tab.items} />
        </TabsContent>
      ))}
      <div className="mt-10 flex justify-center">
        <Button variant="outline" size="lg" asChild>
          <Link href="/products">
            {t.common.actions.viewAll}
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </Tabs>
  );
}
