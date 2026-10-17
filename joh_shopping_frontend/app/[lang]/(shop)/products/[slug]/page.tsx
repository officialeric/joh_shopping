import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Link } from "@/components/ui/link";
import { ProductHero } from "@/components/shop/product-hero";
import { BoughtTogether, ProductTabs, RecentlyViewed } from "@/components/shop/product-details";
import { ProductRail } from "@/components/shop/product-rail";
import { getShop } from "@/lib/data/server";
import { getT } from "@/lib/i18n/server";

export async function generateStaticParams() {
  const { products } = await getShop();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [{ locale }, { getProductBySlug }] = await Promise.all([getT(), getShop()]);
  const product = getProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.shortDescription[locale],
    openGraph: { title: product.name, description: product.shortDescription[locale] },
  };
}

function ProductSkeleton() {
  return (
    <div className="container-page py-6">
      <div className="skeleton mb-6 h-3 w-64 rounded" />
      <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div className="skeleton aspect-square rounded-[28px]" />
        <div className="space-y-4">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton h-10 w-3/4 rounded-lg" />
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-24 rounded-2xl" />
          <div className="skeleton h-12 w-2/3 rounded-full" />
          <div className="skeleton h-12 rounded-full" />
          <div className="skeleton h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function ProductPage({ params }: PageProps<"/[lang]/products/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent params={params} />
    </Suspense>
  );
}

async function ProductContent({ params }: Pick<PageProps<"/[lang]/products/[slug]">, "params">) {
  const { slug } = await params;
  const [{ t, locale }, { boughtTogether, compatibleProducts, getBrand, getCategory, getProductBySlug, relatedProducts }] = await Promise.all([getT(), getShop()]);
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const category = getCategory(product.categoryId);
  const compatible = compatibleProducts(product, 8);
  const related = relatedProducts(product, 8);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription[locale],
    sku: product.variants[0]?.sku,
    brand: { "@type": "Brand", name: getBrand(product.brandId)?.name },
    itemCondition: product.condition === "used" ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition",
    aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviewCount },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "TZS",
      lowPrice: Math.min(...product.variants.map((v) => v.price)),
      highPrice: Math.max(...product.variants.map((v) => v.price)),
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="container-page space-y-16 py-6 sm:space-y-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div>
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-foreground">
            {t.shop.productPage.breadcrumbHome}
          </Link>
          <span>/</span>
          {category && (
            <>
              <Link href={`/products?category=${category.slug}`} className="hover:text-foreground">
                {category.name[locale]}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground">{product.name}</span>
        </nav>
        <ProductHero product={product} />
      </div>

      <BoughtTogether product={product} extras={boughtTogether(product)} />

      <ProductTabs product={product} />

      {compatible.length > 0 && (
        <section>
          <h2 className="mb-6 text-2xl font-semibold">{product.categoryId === "c-phones" ? t.common.product.compatible : t.common.product.compatibleWith}</h2>
          <ProductRail products={compatible} />
        </section>
      )}

      <section>
        <h2 className="mb-6 text-2xl font-semibold">{t.common.product.related}</h2>
        <ProductRail products={related} />
      </section>

      <RecentlyViewed excludeId={product.id} />
    </div>
  );
}
