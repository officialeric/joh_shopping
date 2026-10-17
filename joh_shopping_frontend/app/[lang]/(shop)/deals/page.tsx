import type { Metadata } from "next";
import { FlashSaleSection } from "@/components/shop/home-sections";
import { ProductGrid } from "@/components/shop/product-card";
import { CouponCards } from "@/components/shop/coupon-cards";
import { PageHero } from "@/components/shop/page-hero";
import { getPublicCoupons, getShop } from "@/lib/data/server";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.shop.deals.title, description: t.shop.deals.subtitle };
}

export default async function DealsPage() {
  const [{ t }, { deals, flashSale: flash }, coupons] = await Promise.all([getT(), getShop(), getPublicCoupons()]);
  return (
    <>
      <PageHero eyebrow={t.shop.deals.eyebrow} title={t.shop.deals.title} subtitle={t.shop.deals.subtitle} dark />
      <div className="container-page space-y-16 py-12">
        {flash && <FlashSaleSection sale={flash} />}
        <section>
          <h2 className="mb-6 text-2xl font-semibold">{t.shop.deals.couponsTitle}</h2>
          <CouponCards coupons={coupons} />
        </section>
        <section>
          <h2 className="mb-6 text-2xl font-semibold">{t.shop.deals.allDeals}</h2>
          <ProductGrid products={deals(40)} />
        </section>
      </div>
    </>
  );
}
