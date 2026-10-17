import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, Eye, HeartHandshake, Leaf, MapPin, Phone } from "lucide-react";
import { ProductArt } from "@/components/brand/product-art";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { PageHero } from "@/components/shop/page-hero";
import { getShop } from "@/lib/data/server";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.common.nav.about, description: t.shop.about.intro };
}

export default async function AboutPage() {
  const [{ t, locale }, { stores: pickupStores }] = await Promise.all([getT(), getShop()]);
  const a = t.shop.about;
  const icons = [BadgeCheck, Eye, HeartHandshake, Leaf];
  const stats = [
    ["25,000+", a.stats.customers],
    ["26", a.stats.regions],
    ["3", a.stats.stores],
    ["6", a.stats.years],
  ];

  return (
    <>
      <PageHero eyebrow={a.eyebrow} title={a.title} subtitle={a.intro} dark>
        <dl className="mt-12 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
          {stats.map(([value, label]) => (
            <div key={label}>
              <dt className="font-display text-4xl font-semibold">{value}</dt>
              <dd className="mt-1 text-sm text-white/60">{label}</dd>
            </div>
          ))}
        </dl>
      </PageHero>

      <section className="container-page grid items-center gap-12 py-20 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-surface">
          <div className="absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_50%,rgba(238,47,66,0.15),transparent)]" />
          <div className="absolute inset-[10%] grid grid-cols-3 items-end gap-2">
            <ProductArt kind="phone" camera="vertical" color="#9ea3a8" view="back" />
            <ProductArt kind="phone" camera="trio-square" color="#bfa48f" />
            <ProductArt kind="earbuds" color="#f5f5f3" />
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-semibold">{a.storyTitle}</h2>
          {a.story.map((p) => (
            <p key={p.slice(0, 20)} className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card py-20">
        <div className="container-page">
          <h2 className="mb-10 text-center text-3xl font-semibold">{a.valuesTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {a.values.map((v, i) => {
              const Icon = icons[i]!;
              return (
                <div key={v.title} className="rounded-2xl border border-border bg-background p-6 transition hover:-translate-y-1 hover:shadow-lift">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{v.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <h2 className="mb-8 text-3xl font-semibold">{a.storesTitle}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {pickupStores.map((s) => (
            <div key={s.id} className="flex flex-col rounded-2xl border border-border bg-card p-6">
              <p className="font-semibold">{s.name}</p>
              <p className="mt-3 flex gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                {s.address}
              </p>
              <p className="mt-2 flex gap-2 text-sm text-muted-foreground">
                <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                {s.phone}
              </p>
              <p className="mt-2 text-sm">{s.hours[locale]}</p>
              <a href={s.mapUrl} target="_blank" rel="noreferrer" className="mt-5 text-sm font-semibold text-primary hover:underline">
                {a.directions} →
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page">
        <div className="relative overflow-hidden rounded-[28px] bg-brand-gradient px-8 py-14 text-center text-white sm:px-16">
          <h2 className="text-3xl font-semibold sm:text-4xl">{a.ctaTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">{a.ctaDesc}</p>
          <Button size="lg" variant="white" className="mt-8" asChild>
            <Link href="/products">
              {t.common.actions.shopNow}
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
