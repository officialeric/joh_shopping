"use client";

import { ArrowRight, Heart, MailWarning, MapPin, Package, RotateCcw, Settings, Truck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/primitives";
import { ACTIVE_STATUSES, OrderCard, useMyOrders } from "@/components/account/order-card";
import { OrderTimeline } from "@/components/shop/order-timeline";
import { useAccountUser } from "@/components/account/account-shell";
import { useT } from "@/lib/i18n/client";
import { fmt, formatTZS } from "@/lib/utils";
import { useWishlist } from "@/stores";

export default function AccountOverviewPage() {
  const { t } = useT();
  const o = t.account.overview;
  const user = useAccountUser();
  const wishCount = useWishlist((s) => s.ids.length);
  const { data: orders, isLoading } = useMyOrders();

  const active = orders?.filter((x) => ACTIVE_STATUSES.includes(x.status)) ?? [];
  const spent = orders?.filter((x) => x.status !== "cancelled").reduce((s, x) => s + x.total, 0) ?? 0;
  const stats = [
    { label: o.totalOrders, value: orders?.length ?? 0, icon: Package },
    { label: o.inTransit, value: active.length, icon: Truck },
    { label: o.wishlist, value: wishCount, icon: Heart },
    { label: o.totalSpent, value: formatTZS(spent, { compact: true }), icon: Wallet },
  ];
  const quick = [
    { href: "/account/tracking", label: t.account.nav.tracking, icon: Truck },
    { href: "/account/returns", label: t.account.nav.returns, icon: RotateCcw },
    { href: "/account/addresses", label: t.account.nav.addresses, icon: MapPin },
    { href: "/account/settings", label: t.account.nav.settings, icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[24px] bg-neutral-950 p-6 text-white sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(50%_90%_at_100%_0%,rgba(238,47,66,0.5),transparent_70%)]" />
        <div className="relative">
          <h1 className="text-2xl font-semibold sm:text-3xl">{fmt(o.greeting, { name: user.name.split(" ")[0]! })} 👋</h1>
          <p className="mt-1 text-white/70">{o.subtitle}</p>
        </div>
      </div>

      {!user.emailVerified && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm">
          <span className="flex items-center gap-2 font-medium text-warning">
            <MailWarning className="size-5" />
            {o.verifyEmail}
          </span>
          <Button size="sm" variant="outline" asChild>
            <Link href="/verify-email">{o.verifyNow}</Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <s.icon className="size-5 text-primary" />
            {isLoading ? <Skeleton className="mt-3 h-8 w-16" /> : <p className="mt-3 font-display text-2xl font-semibold">{s.value}</p>}
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{o.recentOrders}</h2>
            <Link href="/account/orders" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              {t.common.actions.viewAll}
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)
              : orders?.slice(0, 3).map((order) => <OrderCard key={order.id} order={order} />)}
          </div>
        </section>
        <div className="space-y-6">
          <section className="rounded-[24px] border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">{o.activeDelivery}</h2>
            {active[0] ? (
              <>
                <Link href={`/account/orders/${active[0].id}`} className="mb-4 block font-display font-semibold hover:text-primary">
                  {active[0].number} →
                </Link>
                <OrderTimeline order={active[0]} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{o.noActive}</p>
            )}
          </section>
          <section>
            <h2 className="mb-3 text-lg font-semibold">{o.quickActions}</h2>
            <div className="grid grid-cols-2 gap-3">
              {quick.map((q) => (
                <Link key={q.href} href={q.href} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-sm font-medium transition hover:border-primary/40 hover:shadow-soft">
                  <q.icon className="size-5 text-primary" />
                  {q.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
