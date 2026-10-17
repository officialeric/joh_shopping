"use client";

import { createContext, useContext, useMemo } from "react";
import type { ShopData } from "@/types";
import { createShop, type Shop } from "./catalog";

const ShopContext = createContext<Shop | null>(null);

/** Makes the cached storefront data (from the root layout) available to client components. */
export function ShopProvider({ data, children }: { data: ShopData; children: React.ReactNode }) {
  const shop = useMemo(() => createShop(data), [data]);
  return <ShopContext value={shop}>{children}</ShopContext>;
}

/** Catalog, shipping, stores and store settings for client components. */
export function useShop(): Shop {
  const shop = useContext(ShopContext);
  if (!shop) throw new Error("useShop() must be used inside <ShopProvider>.");
  return shop;
}
