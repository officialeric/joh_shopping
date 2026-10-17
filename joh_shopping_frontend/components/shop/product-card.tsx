"use client";

import { GitCompare, Heart, ShoppingBag } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/types";
import { ProductArt } from "@/components/brand/product-art";
import { Link } from "@/components/ui/link";
import { Rating } from "@/components/ui/primitives";
import { Tooltip } from "@/components/ui/overlays";
import { useT } from "@/lib/i18n/client";
import { totalStock } from "@/lib/data/catalog";
import { useShop } from "@/lib/data/shop-context";
import { cn, discountPercent, fmt } from "@/lib/utils";
import { useCompare, useHydrated, useWishlist } from "@/stores";
import { Price } from "./price";
import { useProductActions } from "./product-actions";

export function ProductImage({
  product,
  color,
  view,
  className,
}: {
  product: Product;
  color?: string;
  view?: "pair" | "back" | "front";
  className?: string;
}) {
  const hex = color ?? product.colors[0]?.hex;
  if (product.images[0]) {
    // eslint-disable-next-line @next/next/no-img-element -- real uploads will come from the Laravel storage URL
    return <img src={product.images[0]} alt={product.name} className={cn("h-full w-full object-contain", className)} />;
  }
  return <ProductArt kind={product.art.kind} camera={product.art.camera} color={hex} view={view} label={product.name} className={className} />;
}

export function ProductCard({ product, className, priority }: { product: Product; className?: string; priority?: boolean }) {
  const { t, locale } = useT();
  const hydrated = useHydrated();
  const inWishlist = useWishlist((s) => s.ids.includes(product.id));
  const inCompare = useCompare((s) => s.ids.includes(product.id));
  const actions = useProductActions();
  const [color, setColor] = useState(product.colors[0]?.hex);
  const off = discountPercent(product.price, product.compareAtPrice);
  const stock = totalStock(product);
  const brand = useShop().getBrand(product.brandId);
  const isPhone = product.art.kind === "phone";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/10 hover:shadow-lift",
        className,
      )}
      data-priority={priority || undefined}
    >
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden bg-surface" aria-label={product.name}>
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,rgba(255,255,255,0.7),transparent)] dark:bg-[radial-gradient(60%_60%_at_50%_40%,rgba(255,255,255,0.06),transparent)]" />
        <div className="absolute inset-4 transition-transform duration-500 group-hover:scale-[1.04]">
          <ProductImage product={product} color={color} view={isPhone ? "pair" : undefined} />
        </div>
      </Link>

      <div className="pointer-events-none absolute top-3 left-3 flex flex-col items-start gap-1.5">
        {off > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">-{off}%</span>}
        {product.condition === "used" && (
          <span className="rounded-full bg-neutral-950 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-white dark:text-neutral-950">
            {t.common.product.used} · {product.grade}
          </span>
        )}
        {product.tags.includes("new") && product.condition === "new" && (
          <span className="rounded-full border border-border bg-card/90 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">{t.common.product.new}</span>
        )}
      </div>

      <div className="absolute top-3 right-3 flex flex-col gap-1.5 transition-all duration-300 sm:translate-x-2 sm:opacity-0 sm:group-hover:translate-x-0 sm:group-hover:opacity-100 sm:has-[:focus-visible]:translate-x-0 sm:has-[:focus-visible]:opacity-100">
        <Tooltip content={hydrated && inWishlist ? t.common.product.removeFromWishlist : t.common.product.addToWishlist} side="left">
          <button
            onClick={() => actions.toggleWishlist(product)}
            className={cn(
              "flex size-9 items-center justify-center rounded-full border border-border bg-card/90 shadow-soft backdrop-blur transition hover:scale-105",
              hydrated && inWishlist && "border-primary/30 text-primary",
            )}
            aria-label={t.common.product.addToWishlist}
            aria-pressed={hydrated && inWishlist}
          >
            <Heart className="size-4" fill={hydrated && inWishlist ? "currentColor" : "none"} />
          </button>
        </Tooltip>
        <Tooltip content={t.common.product.addToCompare} side="left">
          <button
            onClick={() => actions.toggleCompare(product)}
            className={cn(
              "flex size-9 items-center justify-center rounded-full border border-border bg-card/90 shadow-soft backdrop-blur transition hover:scale-105",
              hydrated && inCompare && "border-primary/30 bg-primary text-white",
            )}
            aria-label={t.common.product.addToCompare}
            aria-pressed={hydrated && inCompare}
          >
            <GitCompare className="size-4" />
          </button>
        </Tooltip>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{brand?.name}</span>
          {product.colors.length > 1 && (
            <div className="flex -space-x-1">
              {product.colors.slice(0, 4).map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  onMouseEnter={() => setColor(c.hex)}
                  className={cn("size-3.5 rounded-full border-2 border-card ring-1 ring-border transition", color === c.hex && "ring-foreground/60")}
                  style={{ background: c.hex }}
                  aria-label={c.name[locale]}
                />
              ))}
            </div>
          )}
        </div>
        <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-10 text-sm leading-5 font-medium hover:text-primary">
          {product.name}
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Rating value={product.rating} size="xs" />
          <span className="tabular-nums">{product.rating.toFixed(1)}</span>
          <span>·</span>
          <span>{fmt(t.common.product.sold, { n: product.sold.toLocaleString("en-US") })}</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="min-w-0">
            {product.variants.length > 1 && <p className="text-[11px] text-muted-foreground">{t.common.product.from}</p>}
            <Price price={product.price} compareAt={product.compareAtPrice} size="md" className="flex-col gap-0 sm:flex-row sm:gap-x-2" />
          </div>
          <Tooltip content={stock > 0 ? t.common.actions.addToCart : t.common.product.outOfStock}>
            <button
              onClick={() => actions.addToCart(product)}
              disabled={stock === 0}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition hover:bg-primary hover:text-white hover:shadow-glow active:scale-95 disabled:opacity-40"
              aria-label={t.common.actions.addToCart}
            >
              <ShoppingBag className="size-4" />
            </button>
          </Tooltip>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, className }: { products: Product[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4", className)}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="skeleton aspect-square" />
      <div className="space-y-2.5 p-4">
        <div className="skeleton h-3 w-16 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton mt-4 h-6 w-24 rounded" />
      </div>
    </div>
  );
}
