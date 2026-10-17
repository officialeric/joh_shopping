import type { Metadata } from "next";
import { CheckoutFlow } from "@/components/shop/checkout-flow";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.shop.checkout.title, robots: { index: false } };
}

export default function CheckoutPage() {
  return <CheckoutFlow />;
}
