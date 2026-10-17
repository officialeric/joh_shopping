import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/shop/page-hero";
import { TrackOrder } from "@/components/shop/track-order";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.shop.track.title, description: t.shop.track.subtitle };
}

export default async function TrackOrderPage() {
  const { t } = await getT();
  return (
    <>
      <PageHero eyebrow={t.shop.track.eyebrow} title={t.shop.track.title} subtitle={t.shop.track.subtitle} className="pb-10" />
      <Suspense>
        <TrackOrder />
      </Suspense>
    </>
  );
}
