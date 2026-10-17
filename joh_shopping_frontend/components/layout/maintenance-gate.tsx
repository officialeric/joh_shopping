"use client";

import { Mail, Phone, Wrench } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher, ThemeToggle } from "@/components/layout/switchers";
import { useShop } from "@/lib/data/shop-context";
import { useT } from "@/lib/i18n/client";
import { useAdminAuth, useHydrated } from "@/stores";

/**
 * Admin → Settings → Maintenance mode. Customers get a maintenance screen
 * instead of the storefront; signed-in staff still see the store (with a
 * banner) so they can check their changes. Checkout is also refused by the API.
 */
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const shop = useShop();
  const hydrated = useHydrated();
  const admin = useAdminAuth((s) => s.admin);
  const { t } = useT();

  if (!shop.settings.maintenanceMode) return children;

  if (hydrated && admin) {
    return (
      <>
        <div role="status" className="bg-warning-soft px-4 py-2 text-center text-xs font-medium text-warning">
          <Wrench className="mr-1.5 inline size-3.5 align-[-2px]" />
          {t.common.maintenance.staffBanner}
        </div>
        {children}
      </>
    );
  }

  const m = t.common.maintenance;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="container-page flex h-16 items-center justify-between">
        <Logo />
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <main className="container-page flex flex-1 flex-col items-center justify-center py-16 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Wrench className="size-7" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{m.title}</h1>
        <p className="mt-3 max-w-md text-muted-foreground text-pretty">{m.body}</p>
        <p className="mt-8 text-sm text-muted-foreground">{m.contact}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-3 text-sm font-medium">
          <a href={shop.contact.phoneHref} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 hover:bg-muted">
            <Phone className="size-4" />
            {shop.contact.phone}
          </a>
          <a href={`mailto:${shop.contact.email}`} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 hover:bg-muted">
            <Mail className="size-4" />
            {shop.contact.email}
          </a>
        </div>
      </main>
      {/* Keeps the route tree mounted until we know whether a staff member is signed in. */}
      {!hydrated && <div hidden>{children}</div>}
    </div>
  );
}
