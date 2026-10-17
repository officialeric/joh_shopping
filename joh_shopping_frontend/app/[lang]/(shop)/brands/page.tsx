import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { ProductArt } from "@/components/brand/product-art";
import { Link } from "@/components/ui/link";
import { PageHero } from "@/components/shop/page-hero";
import { getShop } from "@/lib/data/server";
import { getT } from "@/lib/i18n/server";
import { fmt } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.shop.brandsPage.title, description: t.shop.brandsPage.subtitle };
}

export default async function BrandsPage() {
  const [{ t }, { brands, products }] = await Promise.all([getT(), getShop()]);
  return (
    <>
      <PageHero title={t.shop.brandsPage.title} subtitle={t.shop.brandsPage.subtitle} />
      <div className="container-page grid grid-cols-2 gap-4 py-12 md:grid-cols-3 lg:grid-cols-4">
        {brands.map((b) => {
          const sample = products.filter((p) => p.brandId === b.id).sort((a, c) => c.sold - a.sold)[0];
          return (
            <Link
              key={b.id}
              href={`/products?brand=${b.slug}`}
              className="group relative flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-[24px] border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift"
            >
              {sample && (
                <div className="pointer-events-none absolute -right-6 -bottom-6 size-36 opacity-90 transition-transform duration-500 group-hover:scale-110 sm:size-44">
                  <ProductArt kind={sample.art.kind} camera={sample.art.camera} color={sample.colors[0]?.hex} view={sample.art.kind === "phone" ? "back" : undefined} />
                </div>
              )}
              <div className="flex items-start justify-between">
                <span className="font-display text-2xl font-bold">{b.name}</span>
                <ArrowUpRight className="size-5 text-muted-foreground transition group-hover:text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">{fmt(t.shop.brandsPage.products, { n: b.productCount })}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
