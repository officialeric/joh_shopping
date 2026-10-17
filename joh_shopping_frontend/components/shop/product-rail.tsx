"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import type { Product } from "@/types";
import { useT } from "@/lib/i18n/client";
import { ProductCard } from "./product-card";

/** Horizontally scrolling row of product cards with arrow controls. */
export function ProductRail({ products }: { products: Product[] }) {
  const { t } = useT();
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className="group/rail relative">
      <div ref={ref} className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:gap-4 sm:px-0">
        {products.map((p) => (
          <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[23.5%]">
            <ProductCard product={p} className="h-full" />
          </div>
        ))}
      </div>
      <button
        onClick={() => scroll(-1)}
        className="absolute top-1/3 -left-5 hidden size-11 items-center justify-center rounded-full border border-border bg-card shadow-lift transition group-hover/rail:flex hover:text-primary lg:flex lg:opacity-0 lg:group-hover/rail:opacity-100"
        aria-label={t.common.actions.previous}
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        onClick={() => scroll(1)}
        className="absolute top-1/3 -right-5 hidden size-11 items-center justify-center rounded-full border border-border bg-card shadow-lift transition group-hover/rail:flex hover:text-primary lg:flex lg:opacity-0 lg:group-hover/rail:opacity-100"
        aria-label={t.common.actions.next}
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
