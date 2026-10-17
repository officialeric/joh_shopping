"use client";

import { Heart, Home, LayoutGrid, ShoppingBag, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { Link } from "@/components/ui/link";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { useCart, useHydrated, useUI } from "@/stores";

/** App-style bottom navigation for phones. */
export function MobileTabBar() {
  const { t, locale } = useT();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.qty, 0));
  const setCartOpen = useUI((s) => s.setCartOpen);
  if (pathname.includes("/checkout")) return null;

  const isActive = (href: string) => {
    const full = `/${locale}${href === "/" ? "" : href}`;
    if (href === "/") return pathname === full;
    if (href === "/account") return pathname.startsWith(full) && !pathname.includes("/wishlist");
    return pathname.startsWith(full);
  };

  const item = "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition";
  const tabs = [
    { href: "/", label: t.common.nav.home, icon: Home },
    { href: "/products", label: t.common.nav.shop, icon: LayoutGrid },
    { href: "/account/wishlist", label: t.common.nav.wishlist, icon: Heart },
    { href: "/account", label: t.common.nav.account, icon: User },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="flex h-16">
        {tabs.slice(0, 2).map((tab) => (
          <Link key={tab.href} href={tab.href} className={cn(item, isActive(tab.href) ? "text-primary" : "text-muted-foreground")}>
            <tab.icon className="size-5" />
            {tab.label}
          </Link>
        ))}
        <button onClick={() => setCartOpen(true)} className={cn(item, "text-muted-foreground")}>
          <span className="relative -mt-6 flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-glow ring-4 ring-background">
            <ShoppingBag className="size-5" />
            {hydrated && count > 0 && (
              <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-neutral-950 text-[10px] font-bold text-white ring-2 ring-background">
                {count}
              </span>
            )}
          </span>
          {t.common.nav.cart}
        </button>
        {tabs.slice(2).map((tab) => (
          <Link key={tab.href} href={tab.href} className={cn(item, isActive(tab.href) ? "text-primary" : "text-muted-foreground")}>
            <tab.icon className="size-5" />
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
