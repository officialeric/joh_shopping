import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter, WhatsAppButton } from "@/components/layout/site-footer";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { SearchDialog } from "@/components/layout/search-dialog";
import { CartDrawer } from "@/components/shop/cart-drawer";
import { CompareTray } from "@/components/shop/compare-tray";

export default function ShopLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <SiteFooter />
      <CartDrawer />
      <SearchDialog />
      <Suspense fallback={null}>
        <CompareTray />
      </Suspense>
      <WhatsAppButton />
      <Suspense fallback={null}>
        <MobileTabBar />
      </Suspense>
    </>
  );
}
