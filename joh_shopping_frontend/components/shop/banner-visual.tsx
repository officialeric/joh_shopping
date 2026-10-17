"use client";

import type { Banner } from "@/types";
import { useShop } from "@/lib/data/shop-context";
import { cn } from "@/lib/utils";
import { ProductImage } from "./product-card";

/**
 * The picture on a banner: its own uploaded image when it has one, otherwise
 * the linked product's photo (or its illustration until a photo is added).
 */
export function BannerVisual({ banner, className }: { banner: Banner; className?: string }) {
  const { getProduct } = useShop();
  const product = banner.productId ? getProduct(banner.productId) : undefined;
  if (banner.image) {
    // eslint-disable-next-line @next/next/no-img-element -- uploaded banner image served from the API's storage
    return <img src={banner.image} alt="" className={cn("h-full w-full object-contain", className)} />;
  }
  return product ? <ProductImage product={product} className={className} /> : null;
}
