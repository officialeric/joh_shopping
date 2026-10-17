import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderSuccess } from "@/components/shop/order-success";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.shop.success.title, robots: { index: false } };
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <OrderSuccess />
    </Suspense>
  );
}
