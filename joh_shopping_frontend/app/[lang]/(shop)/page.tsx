import { ArrowRight, BadgeCheck, CreditCard, Quote, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { CategoryIcon } from "@/components/brand/icons";
import { ProductArt } from "@/components/brand/product-art";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { SectionHeading } from "@/components/ui/feedback";
import { BannerVisual } from "@/components/shop/banner-visual";
import { HeroCarousel } from "@/components/shop/hero-carousel";
import { FlashSaleSection, TrendingTabs } from "@/components/shop/home-sections";
import { ProductImage } from "@/components/shop/product-card";
import { ProductRail } from "@/components/shop/product-rail";
import { Rating } from "@/components/ui/primitives";
import { getShop } from "@/lib/data/server";
import { getT } from "@/lib/i18n/server";
import { fmt } from "@/lib/utils";

export default async function HomePage() {
  const [{ t, locale }, shop] = await Promise.all([getT(), getShop()]);
  const { bestSellers, brands, byTag, categories, deals, getProduct, newArrivals, products, banners, flashSale: flash } = shop;
  const h = t.shop.home;
  const heroBanners = banners.filter((b) => b.placement === "hero").sort((a, b) => a.sortOrder - b.sortOrder);
  const promoBanners = banners.filter((b) => b.placement === "promo");
  const usedPhones = products.filter((p) => p.condition === "used");
  /** A product with a real photo to stand for its category (the illustration otherwise). */
  const categoryPhoto = (categoryId: string) => products.find((p) => p.categoryId === categoryId && p.images.length > 0);

  const trust = [
    { icon: BadgeCheck, title: h.trust.genuineTitle, desc: h.trust.genuineDesc },
    { icon: ShieldCheck, title: h.trust.warrantyTitle, desc: h.trust.warrantyDesc },
    { icon: Truck, title: h.trust.deliveryTitle, desc: h.trust.deliveryDesc },
    { icon: CreditCard, title: h.trust.paymentTitle, desc: h.trust.paymentDesc },
  ];

  const budgets = [
    {
      label: h.budgets.entry,
      desc: h.budgets.entryDesc,
      q: "maxPrice=500000",
      product: "p-spark30",
    },
    {
      label: h.budgets.mid,
      desc: h.budgets.midDesc,
      q: "minPrice=500000&maxPrice=1500000",
      product: "p-rn14p",
    },
    {
      label: h.budgets.upper,
      desc: h.budgets.upperDesc,
      q: "minPrice=1500000&maxPrice=3000000",
      product: "p-ip15-used",
    },
    {
      label: h.budgets.premium,
      desc: h.budgets.premiumDesc,
      q: "minPrice=3000000",
      product: "p-ip16pm",
    },
  ];

  return (
    // Phones get tighter spacing, a short hero, slim trust/category strips and no promo
    // banners, so shoppers reach products within the first screen.
    <div className="space-y-12 pt-3 sm:space-y-24 sm:pt-6">
      <h1 className="sr-only">{`${t.common.brand.name}: ${t.common.brand.tagline}`}</h1>
      <section className="container-page">
        {heroBanners.length > 0 && <HeroCarousel banners={heroBanners} />}
        <div className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:mt-4 sm:grid sm:grid-cols-2 sm:gap-3 sm:px-0 lg:grid-cols-4">
          {trust.map((item) => (
            <div key={item.title} className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card py-1.5 pr-3.5 pl-1.5 sm:gap-3 sm:rounded-2xl sm:p-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary sm:size-11 sm:rounded-xl">
                <item.icon className="size-3.5 sm:size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold whitespace-nowrap sm:text-sm">{item.title}</p>
                <p className="hidden truncate text-xs text-muted-foreground sm:block">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page">
        <SectionHeading eyebrow={h.categoriesEyebrow} title={h.categoriesTitle} className="hidden sm:flex" />
        <div className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 sm:hidden">
          {categories.map((c) => (
            <Link key={c.id} href={`/products?category=${c.slug}`} className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card text-primary">
                <CategoryIcon name={c.icon} className="size-6" />
              </span>
              <span className="line-clamp-2 text-[11px] leading-tight font-medium">{c.name[locale]}</span>
            </Link>
          ))}
        </div>
        <div className="hidden grid-cols-2 gap-3 sm:grid sm:grid-cols-4 lg:grid-cols-7">
          {categories.map((c, i) => (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}`}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift ${i === 0 ? "col-span-2 sm:col-span-2 lg:col-span-1" : ""}`}
            >
              <div className="relative mb-3 aspect-square rounded-xl bg-surface p-3">
                {categoryPhoto(c.id) ? (
                  <ProductImage product={categoryPhoto(c.id)!} className="transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <ProductArt
                    kind={c.art}
                    color={["#2b2b2d", "#b5122a", "#f6f6f4", "#1e1f22", "#f5f5f3", "#1f2023", "#e6eef3"][i]}
                    className="transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <CategoryIcon name={c.icon} className="size-4 text-primary" />
                <span className="truncate text-sm font-semibold">{c.name[locale]}</span>
              </div>
              <span className="mt-0.5 text-xs text-muted-foreground">{fmt(h.itemsCount, { n: c.productCount })}</span>
            </Link>
          ))}
        </div>
      </section>

      {flash && (
        <div className="container-page">
          <FlashSaleSection sale={flash} />
        </div>
      )}

      <section className="container-page">
        <TrendingTabs featured={byTag("featured", 8).concat(byTag("trending", 8)).slice(0, 8)} fresh={newArrivals(8)} best={bestSellers(8)} deals={deals(8)} />
      </section>

      <section className="container-page hidden gap-4 md:grid md:grid-cols-2">
        {promoBanners.map((b) => {
          const dark = b.theme === "dark";
          return (
            <Link
              key={b.id}
              href={b.href}
              className={`group relative flex min-h-60 items-center overflow-hidden rounded-[28px] p-8 ${dark ? "bg-neutral-950 text-white" : "bg-brand-gradient text-white"}`}
            >
              <div className="relative z-10 max-w-[55%]">
                <h3 className="text-2xl font-semibold sm:text-3xl">{b.title[locale]}</h3>
                <p className="mt-2 text-sm text-white/75">{b.subtitle[locale]}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
                  {b.cta[locale]}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
              <div className="absolute -right-4 bottom-0 aspect-square h-[110%] transition-transform duration-700 group-hover:scale-105 group-hover:-rotate-3">
                <BannerVisual banner={b} />
              </div>
            </Link>
          );
        })}
      </section>

      <section className="container-page">
        <SectionHeading eyebrow={h.budgetEyebrow} title={h.budgetTitle} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {budgets.map((b, i) => {
            const p = getProduct(b.product) ?? products.find((x) => x.art.kind === "phone");
            if (!p) return null;
            return (
              <Link
                key={b.label}
                href={`/products?category=smartphones&${b.q}`}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-lift sm:p-5"
              >
                <div className="pointer-events-none absolute -right-6 -bottom-8 hidden size-40 opacity-90 transition-transform duration-500 group-hover:-translate-y-2 sm:block">
                  <ProductImage product={p} view="back" />
                </div>
                <span className="hidden text-xs font-semibold tracking-wider text-muted-foreground uppercase sm:inline">0{i + 1}</span>
                <p className="font-display text-base font-semibold sm:mt-6 sm:text-2xl">{b.label}</p>
                <p className="mt-1 text-xs text-muted-foreground sm:max-w-[60%] sm:text-sm">{b.desc}</p>
                <ArrowRight className="mt-6 hidden size-5 text-primary transition-transform group-hover:translate-x-1 sm:block" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container-page">
        <div className="grid items-center gap-6 overflow-hidden rounded-3xl border border-border bg-card p-4 sm:gap-10 sm:rounded-[28px] sm:p-10 lg:grid-cols-2 lg:p-14">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-soft-foreground">
              <Sparkles className="size-3.5" />
              {h.usedEyebrow}
            </p>
            <h2 className="text-2xl font-semibold text-balance sm:text-4xl">{h.usedTitle}</h2>
            <p className="mt-4 hidden text-muted-foreground sm:block">{h.usedDesc}</p>
            <ol className="mt-8 hidden space-y-5 sm:block">
              {h.usedSteps.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm font-semibold text-secondary-foreground">{i + 1}</span>
                  <div>
                    <p className="font-semibold">{s.title}</p>
                    <p className="text-sm text-muted-foreground">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Button size="lg" className="mt-8 hidden sm:inline-flex" asChild>
              <Link href="/products?condition=used">
                {h.usedCta}
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {usedPhones.slice(0, 4).map((p) => (
              <Link key={p.id} href={`/products/${p.slug}`} className="group rounded-2xl bg-surface p-4 transition hover:shadow-lift">
                <div className="aspect-square">
                  <ProductImage product={p} view="back" className="transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{p.name.replace(" (Used)", "")}</span>
                  <span className="shrink-0 rounded-full bg-neutral-950 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-white dark:text-neutral-950">
                    {p.grade}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page">
        <SectionHeading
          eyebrow={h.newArrivalsEyebrow}
          title={t.common.nav.newArrivals}
          action={
            <Button variant="ghost" asChild>
              <Link href="/products?sort=newest">
                {t.common.actions.viewAll}
                <ArrowRight />
              </Link>
            </Button>
          }
        />
        <ProductRail products={newArrivals(10)} />
      </section>

      <section className="overflow-hidden border-y border-border bg-card py-10">
        <p className="mb-6 text-center text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">{h.brandsTitle}</p>
        <div className="relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
          <div className="flex shrink-0 animate-[marquee_40s_linear_infinite] gap-16 pr-16 hover:[animation-play-state:paused]">
            {[...brands, ...brands].map((b, i) => (
              <Link key={`${b.id}-${i}`} href={`/products?brand=${b.slug}`} className="font-display text-2xl font-bold whitespace-nowrap text-muted-foreground/60 transition hover:text-primary">
                {b.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-primary uppercase">{h.testimonialsEyebrow}</p>
            <h2 className="text-3xl font-semibold text-balance">{h.testimonialsTitle}</h2>
            <dl className="mt-8 hidden grid-cols-2 gap-4 sm:grid">
              {[
                ["25K+", h.statsCustomers],
                ["26", h.statsRegions],
                ["4.8★", h.statsRating],
                ["3", h.statsStores],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-border bg-card p-4">
                  <dt className="font-display text-3xl font-semibold text-primary">{value}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:px-0">
            {h.testimonials.map((item) => (
              <figure key={item.name} className="flex w-[80%] shrink-0 snap-start flex-col rounded-2xl border border-border bg-card p-5 sm:p-6 md:w-auto">
                <Quote className="size-7 text-primary/30" />
                <Rating value={5} className="mt-3" />
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed">{item.text}</blockquote>
                <figcaption className="mt-5 border-t border-border pt-4">
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.city}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
