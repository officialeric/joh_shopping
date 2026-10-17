import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Link } from "@/components/ui/link";
import { PageHero, RichText } from "@/components/shop/page-hero";
import { getPage, getShop } from "@/lib/data/server";
import { getT } from "@/lib/i18n/server";

export async function generateStaticParams() {
  const { pages } = await getShop();
  return pages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/policies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [{ locale }, page] = await Promise.all([getT(), getPage(slug)]);
  return page ? { title: page.title[locale] } : {};
}

export default function PolicyPage({ params }: PageProps<"/[lang]/policies/[slug]">) {
  return (
    <Suspense fallback={<div className="container-page py-20"><div className="skeleton h-12 w-1/2 rounded-xl" /></div>}>
      <PolicyContent params={params} />
    </Suspense>
  );
}

async function PolicyContent({ params }: Pick<PageProps<"/[lang]/policies/[slug]">, "params">) {
  const { slug } = await params;
  const [{ locale }, page, { pages: policyPages }] = await Promise.all([getT(), getPage(slug), getShop()]);
  if (!page) notFound();
  return (
    <>
      <PageHero title={page.title[locale]} />
      <div className="container-page grid gap-10 py-14 lg:grid-cols-[220px_1fr]">
        <nav className="order-2 lg:order-1">
          <ul className="space-y-1 lg:sticky lg:top-24">
            {policyPages.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/policies/${p.slug}`}
                  className={`block rounded-xl px-3 py-2 text-sm font-medium transition ${p.slug === slug ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-accent"}`}
                >
                  {p.title[locale]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="order-1 max-w-3xl lg:order-2">
          <RichText text={page.body[locale]} />
        </article>
      </div>
    </>
  );
}
