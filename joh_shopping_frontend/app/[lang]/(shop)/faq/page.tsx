import type { Metadata } from "next";
import { MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/primitives";
import { PageHero } from "@/components/shop/page-hero";
import { getShop } from "@/lib/data/server";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.shop.faq.title, description: t.shop.faq.subtitle };
}

export default async function FaqPage() {
  const [{ t }, { contact }] = await Promise.all([getT(), getShop()]);
  const f = t.shop.faq;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: f.groups.flatMap((g) => g.items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } }))),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHero eyebrow={f.eyebrow} title={f.title} subtitle={f.subtitle} />
      <section className="container-page grid gap-10 py-16 lg:grid-cols-[240px_1fr]">
        <nav className="hidden lg:block">
          <ul className="sticky top-24 space-y-1">
            {f.groups.map((g, i) => (
              <li key={g.title}>
                <a href={`#faq-${i}`} className="block rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground">
                  {g.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-10">
          {f.groups.map((g, i) => (
            <div key={g.title} id={`faq-${i}`} className="scroll-mt-24">
              <h2 className="mb-3 text-xl font-semibold">{g.title}</h2>
              <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-5">
                {g.items.map((item) => (
                  <AccordionItem key={item.q} value={item.q}>
                    <AccordionTrigger>{item.q}</AccordionTrigger>
                    <AccordionContent>{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] bg-neutral-950 p-6 text-white sm:p-8">
            <div>
              <p className="text-lg font-semibold">{f.stillNeedHelp}</p>
              <p className="text-sm text-white/60">{f.stillNeedHelpDesc}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="white" asChild>
                <a href={contact.phoneHref}>
                  <Phone />
                  {t.shop.contact.callTitle}
                </a>
              </Button>
              <Button asChild>
                <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer">
                  <MessageCircle />
                  WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
