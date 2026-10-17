"use client";

import {
  Activity,
  BadgePercent,
  BarChart3,
  Bell,
  Boxes,
  ExternalLink,
  FileText,
  FolderTree,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Package,
  Receipt,
  RotateCcw,
  Search,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Tag,
  Truck,
  UserCog,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { AdminUser, Permission } from "@/types";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Link, NavLink } from "@/components/ui/link";
import { Avatar, Skeleton } from "@/components/ui/primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/overlays";
import { LanguageSwitcher, ThemeToggle } from "@/components/layout/switchers";
import { navCounts } from "@/lib/api/admin";
import { useLocalizedRouter, useT } from "@/lib/i18n/client";
import { cn, fmt } from "@/lib/utils";
import { adminLogout } from "@/lib/api/admin";
import { useAdminAuth, useHydrated } from "@/stores";
import { AdminCommand } from "./admin-command";

const PLACEHOLDER: AdminUser = { id: "", name: "", email: "", roleId: "", roleName: "", permissions: [] };

/** Current staff member and permission check (permissions come from GET /api/admin/user). Never null (see AccountShell for why). */
export function useAdmin() {
  const admin = useAdminAuth((s) => s.admin) ?? PLACEHOLDER;
  const perms = useMemo(() => new Set(admin.permissions ?? []), [admin.permissions]);
  return { admin, roleName: admin.roleName, can: (p: Permission) => perms.has(p) };
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  perm: Permission;
  exact?: boolean;
  badge?: number;
}

export function useAdminNav() {
  const { t } = useT();
  const n = t.admin.nav;
  const adminId = useAdminAuth((s) => s.admin?.id);
  const { data: counts } = useQuery({
    queryKey: ["admin", "nav-counts"],
    queryFn: navCounts,
    enabled: !!adminId,
    refetchInterval: 30_000,
  });
  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: n.overview,
      items: [
        { href: "/admin", label: n.dashboard, icon: LayoutDashboard, perm: "dashboard.view", exact: true },
        { href: "/admin/reports", label: n.reports, icon: BarChart3, perm: "reports.view" },
      ],
    },
    {
      title: n.sales,
      items: [
        { href: "/admin/orders", label: n.orders, icon: ShoppingCart, perm: "orders.view", badge: counts?.orders },
        { href: "/admin/payments", label: n.payments, icon: Receipt, perm: "payments.view" },
        { href: "/admin/returns", label: n.returns, icon: RotateCcw, perm: "returns.manage", badge: counts?.returns },
        { href: "/admin/customers", label: n.customers, icon: Users, perm: "customers.manage" },
      ],
    },
    {
      title: n.catalog,
      items: [
        { href: "/admin/products", label: n.products, icon: Package, perm: "products.manage" },
        { href: "/admin/categories", label: n.categories, icon: FolderTree, perm: "categories.manage" },
        { href: "/admin/brands", label: n.brands, icon: Tag, perm: "categories.manage" },
        { href: "/admin/attributes", label: n.attributes, icon: SlidersHorizontal, perm: "products.manage" },
        { href: "/admin/inventory", label: n.inventory, icon: Boxes, perm: "inventory.manage" },
      ],
    },
    {
      title: n.marketing,
      items: [
        { href: "/admin/coupons", label: n.coupons, icon: BadgePercent, perm: "promotions.manage" },
        { href: "/admin/flash-sales", label: n.flashSales, icon: Zap, perm: "promotions.manage" },
        { href: "/admin/banners", label: n.banners, icon: ImageIcon, perm: "content.manage" },
        { href: "/admin/reviews", label: n.reviews, icon: Star, perm: "reviews.manage", badge: counts?.reviews },
      ],
    },
    {
      title: n.content,
      items: [
        { href: "/admin/pages", label: n.pages, icon: FileText, perm: "content.manage" },
        { href: "/admin/messages", label: n.messages, icon: MessageSquare, perm: "messages.manage", badge: counts?.messages },
        { href: "/admin/subscribers", label: n.subscribers, icon: Mail, perm: "messages.manage" },
      ],
    },
    {
      title: n.operations,
      items: [{ href: "/admin/shipping", label: n.shipping, icon: Truck, perm: "shipping.manage" }],
    },
    {
      title: n.team,
      items: [
        { href: "/admin/staff", label: n.staff, icon: UserCog, perm: "staff.manage" },
        { href: "/admin/roles", label: n.roles, icon: KeyRound, perm: "roles.manage" },
        { href: "/admin/activity", label: n.activity, icon: Activity, perm: "activity.view" },
        { href: "/admin/settings", label: n.settings, icon: Settings, perm: "settings.manage" },
      ],
    },
  ];
  return { groups, counts };
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { groups } = useAdminNav();
  const { can } = useAdmin();
  return (
    <nav className="space-y-5 px-3 pb-6">
      {groups.map((g) => {
        const items = g.items.filter((i) => can(i.perm));
        if (!items.length) return null;
        return (
          <div key={g.title}>
            <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-[0.16em] text-white/35 uppercase">{g.title}</p>
            <div className="space-y-0.5">
              {items.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  exact={item.exact}
                  onClick={onNavigate}
                  className="group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
                  activeClassName="bg-white/10 text-white before:absolute before:top-1/2 before:-left-3 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-brand-500"
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {!!item.badge && (
                    <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] leading-none font-semibold text-white">{item.badge}</span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useT();
  return (
    <div className="flex h-full flex-col bg-neutral-950 text-white">
      <div className="flex h-16 shrink-0 items-center gap-2 px-5">
        <Link href="/admin" onClick={onNavigate}>
          <Logo inverted />
        </Link>
        <span className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-white/70 uppercase">Admin</span>
      </div>
      <div className="scrollbar-none flex-1 overflow-y-auto pt-2">
        <SidebarNav onNavigate={onNavigate} />
      </div>
      <div className="border-t border-white/10 p-3">
        <Link href="/" target="_blank" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white">
          <ExternalLink className="size-4" />
          {t.admin.topbar.viewStore}
        </Link>
      </div>
    </div>
  );
}

function Topbar({ onSearch }: { onSearch: () => void }) {
  const { t } = useT();
  const { admin, roleName } = useAdmin();
  const setAdmin = useAdminAuth((s) => s.setAdmin);
  const router = useLocalizedRouter();
  const { counts } = useAdminNav();
  const [mobileOpen, setMobileOpen] = useState(false);
  const total = (counts?.orders ?? 0) + (counts?.returns ?? 0) + (counts?.reviews ?? 0) + (counts?.messages ?? 0);
  const alerts = [
    { n: counts?.orders ?? 0, label: t.admin.topbar.newOrders, href: "/admin/orders" },
    { n: counts?.returns ?? 0, label: t.admin.dashboard.pendingReturns, href: "/admin/returns" },
    { n: counts?.reviews ?? 0, label: t.admin.topbar.pendingReviews, href: "/admin/reviews" },
    { n: counts?.messages ?? 0, label: t.admin.topbar.newMessages, href: "/admin/messages" },
  ].filter((a) => a.n > 0);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl sm:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t.common.nav.menu}>
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" heading={t.admin.panel} className="max-w-[280px] border-0 bg-neutral-950 p-0 [&>div:first-of-type]:hidden">
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <button
        onClick={onSearch}
        className="flex h-10 w-full max-w-md items-center gap-3 rounded-full border border-border bg-card px-4 text-sm text-muted-foreground transition hover:border-foreground/20"
      >
        <Search className="size-4" />
        <span className="flex-1 truncate text-left">{t.admin.topbar.search}</span>
        <kbd className="hidden rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] sm:inline">⌘K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-1">
        <LanguageSwitcher className="hidden sm:inline-flex" />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger className="relative inline-flex size-10 items-center justify-center rounded-full outline-none hover:bg-accent" aria-label={t.admin.topbar.notifications}>
            <Bell className="size-[18px]" />
            {total > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-background" />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>{t.admin.topbar.notifications}</DropdownMenuLabel>
            {alerts.length === 0 ? (
              <p className="px-2.5 py-3 text-sm text-muted-foreground">{t.account.notifications.empty}</p>
            ) : (
              alerts.map((a) => (
                <DropdownMenuItem key={a.href} onSelect={() => router.push(a.href)}>
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">{a.n}</span>
                  {fmt(a.label, { n: a.n })}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-1 outline-none hover:bg-accent sm:pr-3">
            <Avatar name={admin.name || "A"} className="size-8" />
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-medium">{admin.name}</span>
              <span className="block text-[11px] text-muted-foreground">{roleName}</span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{admin.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => window.open(`/${window.location.pathname.split("/")[1]}`, "_blank")}>
              <ExternalLink />
              {t.admin.topbar.viewStore}
            </DropdownMenuItem>
            <DropdownMenuItem
              destructive
              onSelect={() => {
                adminLogout().catch(() => {});
                setAdmin(null);
                router.replace("/admin/login");
              }}
            >
              <LogOut />
              {t.admin.topbar.logout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const admin = useAdminAuth((s) => s.admin);
  const router = useLocalizedRouter();
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !admin) router.replace("/admin/login");
  }, [hydrated, admin, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-dvh bg-muted/40 lg:pl-[260px] dark:bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] lg:block">
        <Sidebar />
      </aside>
      <Topbar onSearch={() => setCmdOpen(true)} />
      <main className="p-4 sm:p-6 lg:p-8">
        {!hydrated || !admin ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-72" />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
            <Skeleton className="h-96" />
            <div hidden>{children}</div>
          </div>
        ) : (
          children
        )}
      </main>
      <AdminCommand open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}

/** Wrap page content that needs a permission. */
export function RequirePermission({ perm, children }: { perm: Permission; children: React.ReactNode }) {
  const { t } = useT();
  const { can, admin } = useAdmin();
  if (admin.id && !can(perm)) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-border bg-card py-24 text-center">
        <KeyRound className="size-10 text-primary" />
        <h1 className="mt-4 text-xl font-semibold">{t.admin.noAccess.title}</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t.admin.noAccess.desc}</p>
      </div>
    );
  }
  return <>{children}</>;
}

export function AdminPageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
