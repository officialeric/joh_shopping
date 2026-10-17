"use client";

import { useState } from "react";
import type { Product } from "@/types";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { ProductImage } from "./product-card";

type View = "pair" | "back" | "front" | undefined;

export function ProductGallery({ product, color }: { product: Product; color: string }) {
  const { t } = useT();
  const views: View[] = product.art.kind === "phone" ? ["pair", "back", "front"] : [undefined];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const discount = product.compareAtPrice ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : 0;

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row" aria-label={t.shop.productPage.gallery}>
      {views.length > 1 && (
        <div className="flex gap-3 lg:flex-col">
          {views.map((v, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "size-20 shrink-0 rounded-2xl border-2 bg-surface p-2 transition",
                active === i ? "border-primary" : "border-transparent hover:border-border",
              )}
              aria-label={`${t.shop.productPage.gallery} ${i + 1}`}
              aria-pressed={active === i}
            >
              <ProductImage product={product} color={color} view={v} />
            </button>
          ))}
        </div>
      )}
      <div
        className="relative aspect-square flex-1 cursor-zoom-in overflow-hidden rounded-[28px] bg-surface"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,rgba(255,255,255,0.8),transparent)] dark:bg-[radial-gradient(60%_60%_at_50%_40%,rgba(255,255,255,0.05),transparent)]" />
        {discount > 0 && (
          <span className="absolute top-5 left-5 z-10 rounded-full bg-primary px-3 py-1 text-sm font-semibold text-white shadow-glow">-{discount}%</span>
        )}
        {product.condition === "used" && (
          <span className="absolute top-5 right-5 z-10 rounded-full bg-neutral-950 px-3 py-1 text-xs font-semibold text-white">
            {t.common.product.used} · {t.common.product.grade.replace("{grade}", product.grade ?? "")}
          </span>
        )}
        <div
          key={`${color}-${active}`}
          className="absolute inset-8 animate-[fade-in_0.35s_ease-out] transition-transform duration-200 sm:inset-12"
          style={zoom ? { transform: "scale(1.6)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        >
          <ProductImage product={product} color={color} view={views[active]} />
        </div>
      </div>
    </div>
  );
}
