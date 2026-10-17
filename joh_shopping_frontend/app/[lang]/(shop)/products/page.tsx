import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsExplorer } from "@/components/shop/products-explorer";
import { ProductCardSkeleton } from "@/components/shop/product-card";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.shop.listing.allProducts, description: t.common.footer.about };
}

function ExplorerFallback() {
  return (
    <div>
      <div className="border-b border-border bg-card">
        <div className="container-page space-y-3 py-10">
          <div className="skeleton h-3 w-40 rounded" />
          <div className="skeleton h-9 w-72 rounded-lg" />
          <div className="skeleton h-4 w-56 rounded" />
        </div>
      </div>
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[260px_1fr]">
        <div className="hidden space-y-3 lg:block">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-10 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ExplorerFallback />}>
      <ProductsExplorer />
    </Suspense>
  );
}
