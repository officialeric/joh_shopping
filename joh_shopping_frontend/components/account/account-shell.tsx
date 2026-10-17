"use client";

import {
  Bell,
  CreditCard,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  RotateCcw,
  Settings,
  Shield,
  Star,
  Truck,
  User,
} from "lucide-react";
import { useEffect } from "react";
import { Avatar, Skeleton } from "@/components/ui/primitives";
import { NavLink } from "@/components/ui/link";
import { useLocalizedRouter, useT } from "@/lib/i18n/client";
import { fmt, formatDate } from "@/lib/utils";
import { logout } from "@/lib/api/shop";
import { useAuth, useHydrated } from "@/stores";
import type { User as AuthUser } from "@/types";

const PLACEHOLDER_USER: AuthUser = { id: "", name: "", email: "", phone: "", emailVerified: true, twoFactor: false, createdAt: "1970-01-01T00:00:00Z" };

/**
 * The signed-in customer. AccountShell only renders pages once a user exists,
 * but pages can also render in isolation (prerender / navigation validation),
 * so this never returns null.
 */
export function useAccountUser(): AuthUser {
  return useAuth((s) => s.user) ?? PLACEHOLDER_USER;
}

export function useAccountNav() {
  const { t } = useT();
  const n = t.account.nav;
  return [
    {
      group: n.groupShopping,
      items: [
        { href: "/account", label: n.overview, icon: LayoutDashboard, exact: true },
        { href: "/account/orders", label: n.orders, icon: Package },
        { href: "/account/tracking", label: n.tracking, icon: Truck },
        { href: "/account/wishlist", label: n.wishlist, icon: Heart },
        { href: "/account/returns", label: n.returns, icon: RotateCcw },
        { href: "/account/reviews", label: n.reviews, icon: Star },
      ],
    },
    {
      group: n.groupAccount,
      items: [
        { href: "/account/notifications", label: n.notifications, icon: Bell },
        { href: "/account/addresses", label: n.addresses, icon: MapPin },
        { href: "/account/payments", label: n.payments, icon: CreditCard },
        { href: "/account/profile", label: n.profile, icon: User },
        { href: "/account/security", label: n.security, icon: Shield },
        { href: "/account/settings", label: n.settings, icon: Settings },
      ],
    },
  ];
}

export function AccountShell({ children }: { children: React.ReactNode }) {
  const { t, locale } = useT();
  const hydrated = useHydrated();
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const router = useLocalizedRouter();
  const nav = useAccountNav();

  useEffect(() => {
    if (hydrated && !user) {
      const next = window.location.pathname.replace(/^\/(sw|en)/, "");
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [hydrated, user, router]);

  // Until the session is known, show a skeleton. The page tree still renders
  // (hidden, with no customer data) so prerendering can validate it.
  if (!hydrated || !user) {
    return (
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[260px_1fr]">
        <Skeleton className="hidden h-[520px] lg:block" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
          <div hidden>{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-[260px_1fr] lg:py-10">
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <Avatar name={user.name} className="size-11" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{fmt(t.account.overview.memberSince, { date: formatDate(user.createdAt, locale, { month: "short", year: "numeric" }) })}</p>
            </div>
          </div>
          <nav className="rounded-2xl border border-border bg-card p-2">
            {nav.map((g) => (
              <div key={g.group} className="py-1">
                <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{g.group}</p>
                {g.items.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    exact={item.exact}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
                    activeClassName="bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft hover:text-primary-soft-foreground"
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
            <button
              onClick={() => {
                logout().catch(() => {});
                setUser(null);
                router.push("/");
              }}
              className="mt-1 flex w-full items-center gap-3 rounded-xl border-t border-border px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-primary-soft hover:text-primary"
            >
              <LogOut className="size-4" />
              {t.common.nav.logout}
            </button>
          </nav>
        </div>
      </aside>

      <div className="min-w-0">
        <nav className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 lg:hidden">
          {nav.flatMap((g) => g.items).map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              exact={item.exact}
              className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium"
              activeClassName="border-foreground bg-foreground text-background"
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}

export function AccountHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Settings-style section card with a title column. */
export function SettingsSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 rounded-[24px] border border-border bg-card p-6 md:grid-cols-[220px_1fr] md:p-8">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
