"use client";

import {
  ChevronDown,
  Heart,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  Phone,
  Search,
  Settings,
  ShoppingBag,
  Truck,
  User,
  UserCircle2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { CategoryIcon } from "@/components/brand/icons";
import { ProductArt } from "@/components/brand/product-art";
import { Link, NavLink } from "@/components/ui/link";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/overlays";
import { useShop } from "@/lib/data/shop-context";
import { useLocalizedRouter, useT } from "@/lib/i18n/client";
import { cn, fmt } from "@/lib/utils";
import { logout } from "@/lib/api/shop";
import { useAuth, useCart, useHydrated, useUI, useWishlist } from "@/stores";
import { LanguageSwitcher, ThemeToggle } from "./switchers";

function TopBar() {
  const { contact } = useShop();
  const { t } = useT();
  const messages = [t.common.topbar.freeDelivery, t.common.topbar.genuine];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % messages.length), 5000);
    return () => clearInterval(id);
  }, [messages.length]);
  return (
    <div className="bg-neutral-950 text-white">
      <div className="container-page flex h-9 items-center justify-between gap-4 text-xs">
        <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hidden items-center gap-1.5 text-white/70 hover:text-white md:flex">
          <Phone className="size-3.5" />
          {t.common.topbar.callUs}: {contact.phone}
        </a>
        <p key={i} className="flex-1 animate-[fade-up_0.4s_ease-out] truncate text-center font-medium text-white/90 md:flex-none">
          {messages[i]}
        </p>
        <div className="hidden items-center gap-4 md:flex">
          <Link href="/track-order" className="flex items-center gap-1.5 text-white/70 hover:text-white">
            <Truck className="size-3.5" />
            {t.common.nav.trackOrder}
          </Link>
          <LanguageSwitcher variant="topbar" />
        </div>
      </div>
    </div>
  );
}

function MegaMenu() {
  const { brands, categories } = useShop();
  const { t, locale } = useT();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="group inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-4 text-sm font-medium text-secondary-foreground transition outline-none hover:opacity-90">
        <LayoutGrid className="size-4" />
        {t.common.nav.categories}
        <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={14} className="w-[min(92vw,860px)] p-0">
        <div className="grid grid-cols-[1fr_260px]">
          <div className="p-6">
            <p className="mb-4 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">{t.common.nav.allCategories}</p>
            <div className="grid grid-cols-2 gap-1">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/products?category=${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="group/item flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-accent"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary transition group-hover/item:bg-primary group-hover/item:text-white">
                    <CategoryIcon name={c.icon} className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{c.name[locale]}</span>
                    <span className="block truncate text-xs text-muted-foreground">{c.description[locale]}</span>
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-5 border-t border-border pt-5">
              <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">{t.common.nav.brands}</p>
              <div className="flex flex-wrap gap-2">
                {brands.slice(0, 8).map((b) => (
                  <Link
                    key={b.id}
                    href={`/products?brand=${b.slug}`}
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-border px-3 py-1 text-sm transition hover:border-primary hover:text-primary"
                  >
                    {b.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <Link
            href="/products?condition=used"
            onClick={() => setOpen(false)}
            className="relative flex flex-col justify-between overflow-hidden rounded-r-xl bg-brand-gradient p-6 text-white"
          >
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-white/70 uppercase">{t.common.product.usedBanner}</p>
              <p className="mt-2 font-display text-xl font-semibold">{t.common.nav.usedPhones}</p>
              <p className="mt-1 text-sm text-white/80">{t.common.product.usedBannerDesc}</p>
            </div>
            <div className="mx-auto h-40 w-40">
              <ProductArt kind="phone" camera="trio-square" color="#c2bcb2" />
            </div>
            <span className="text-sm font-semibold">{t.common.actions.shopNow} →</span>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AccountMenu() {
  const { t } = useT();
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const hydrated = useHydrated();
  const router = useLocalizedRouter();

  if (!hydrated || !user) {
    return (
      <Link
        href="/login"
        className="inline-flex size-10 items-center justify-center rounded-full transition hover:bg-accent lg:w-auto lg:gap-2 lg:px-3"
        aria-label={t.common.nav.login}
      >
        <UserCircle2 className="size-5" />
        <span className="hidden text-sm font-medium lg:inline">{t.common.nav.login}</span>
      </Link>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-full p-1 transition outline-none hover:bg-accent lg:pr-3" aria-label={t.common.nav.account}>
        <Avatar name={user.name} className="size-8" />
        <span className="hidden max-w-24 truncate text-sm font-medium lg:inline">{user.name.split(" ")[0]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-3 py-2">
          <Avatar name={user.name} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">{user.name}</span>
            <span className="block truncate text-xs">{user.email}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/account")}>
          <User />
          {t.common.nav.account}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/account/orders")}>
          <Package />
          {t.common.nav.myOrders}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/account/wishlist")}>
          <Heart />
          {t.common.nav.wishlist}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/account/settings")}>
          <Settings />
          {t.account.nav.settings}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          onSelect={() => {
            logout().catch(() => {});
            setUser(null);
            router.push("/");
          }}
        >
          <LogOut />
          {t.common.nav.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CountBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white ring-2 ring-background tabular-nums">
      {n > 99 ? "99+" : n}
    </span>
  );
}

function MobileNav() {
  const { categories } = useShop();
  const { t, locale } = useT();
  const user = useAuth((s) => s.user);
  const hydrated = useHydrated();
  const links = [
    { href: "/", label: t.common.nav.home },
    { href: "/products", label: t.common.nav.products },
    { href: "/products?condition=new&category=smartphones", label: t.common.nav.newPhones },
    { href: "/products?condition=used", label: t.common.nav.usedPhones },
    { href: "/deals", label: t.common.nav.deals },
    { href: "/brands", label: t.common.nav.brands },
    { href: "/compare", label: t.common.nav.compare },
    { href: "/track-order", label: t.common.nav.trackOrder },
    { href: "/about", label: t.common.nav.about },
    { href: "/contact", label: t.common.nav.contact },
    { href: "/faq", label: t.common.nav.faq },
  ];
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t.common.nav.menu}>
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" heading={<Logo />}>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {hydrated && user ? (
            <SheetClose asChild>
              <Link href="/account" className="mb-4 flex items-center gap-3 rounded-2xl bg-muted p-3">
                <Avatar name={user.name} />
                <span className="min-w-0">
                  <span className="block text-xs text-muted-foreground">{t.common.nav.hello},</span>
                  <span className="block truncate font-semibold">{user.name}</span>
                </span>
              </Link>
            </SheetClose>
          ) : (
            <div className="mb-4 grid grid-cols-2 gap-2 px-2">
              <SheetClose asChild>
                <Button asChild variant="outline">
                  <Link href="/login">{t.common.nav.login}</Link>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button asChild>
                  <Link href="/register">{t.common.nav.register}</Link>
                </Button>
              </SheetClose>
            </div>
          )}
          <p className="px-3 pb-2 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">{t.common.nav.categories}</p>
          <div className="mb-4 grid grid-cols-2 gap-2 px-2">
            {categories.map((c) => (
              <SheetClose asChild key={c.id}>
                <Link href={`/products?category=${c.slug}`} className="flex items-center gap-2 rounded-xl border border-border p-2.5 text-sm">
                  <CategoryIcon name={c.icon} className="size-4 text-primary" />
                  <span className="truncate">{c.name[locale]}</span>
                </Link>
              </SheetClose>
            ))}
          </div>
          <nav className="grid">
            {links.map((l) => (
              <SheetClose asChild key={l.href}>
                <Link href={l.href} className="rounded-xl px-3 py-2.5 text-[15px] font-medium transition hover:bg-accent">
                  {l.label}
                </Link>
              </SheetClose>
            ))}
          </nav>
        </div>
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function SiteHeader() {
  const { t } = useT();
  const hydrated = useHydrated();
  const cartCount = useCart((s) => s.lines.reduce((n, l) => n + l.qty, 0));
  const wishCount = useWishlist((s) => s.ids.length);
  const setCartOpen = useUI((s) => s.setCartOpen);
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, [setSearchOpen]);

  const nav = [
    { href: "/products?category=smartphones&condition=new", label: t.common.nav.newPhones },
    { href: "/products?condition=used", label: t.common.nav.usedPhones },
    { href: "/products?category=audio", label: t.common.nav.accessories },
    { href: "/deals", label: t.common.nav.deals, hot: true },
  ];

  return (
    <>
      <TopBar />
      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-all duration-300",
          scrolled ? "border-border bg-background/80 shadow-soft backdrop-blur-xl" : "border-transparent bg-background",
        )}
      >
        <div className="container-page flex h-16 items-center gap-2 lg:h-[72px] lg:gap-6">
          <MobileNav />
          <Link href="/" aria-label={t.common.brand.name} className="shrink-0">
            <Logo />
          </Link>

          <div className="hidden lg:block">
            <MegaMenu />
          </div>

          <nav className="hidden items-center gap-1 xl:flex">
            {nav.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                className="relative rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition hover:text-foreground"
                activeClassName="text-foreground"
              >
                {item.label}
                {item.hot && <span className="absolute top-1.5 right-1 size-1.5 rounded-full bg-primary" />}
              </NavLink>
            ))}
          </nav>

          <button
            onClick={() => setSearchOpen(true)}
            className="ml-auto hidden h-11 w-full max-w-sm min-w-0 flex-1 items-center gap-3 rounded-full border border-border bg-card px-4 text-sm text-muted-foreground shadow-xs transition hover:border-foreground/20 md:flex"
          >
            <Search className="size-4" />
            <span className="flex-1 truncate text-left">{t.common.nav.searchPlaceholder}</span>
            <kbd className="hidden rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium lg:inline">⌘K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-0.5 md:ml-0">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSearchOpen(true)} aria-label={t.common.actions.search}>
              <Search className="size-5" />
            </Button>
            <ThemeToggle className="hidden sm:inline-flex" />
            <Link
              href="/account/wishlist"
              className="relative hidden size-10 items-center justify-center rounded-full transition hover:bg-accent sm:inline-flex"
              aria-label={t.common.nav.wishlist}
            >
              <Heart className="size-5" />
              {hydrated && <CountBadge n={wishCount} />}
            </Link>
            <AccountMenu />
            <button
              onClick={() => setCartOpen(true)}
              className="relative inline-flex size-10 items-center justify-center rounded-full transition hover:bg-accent"
              aria-label={fmt(`${t.common.nav.cart} ({n})`, { n: hydrated ? cartCount : 0 })}
            >
              <ShoppingBag className="size-5" />
              {hydrated && <CountBadge n={cartCount} />}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
