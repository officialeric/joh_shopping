import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/brand/icons";
import { Link } from "@/components/ui/link";
import { PageHero } from "@/components/shop/page-hero";
import { ContactForm } from "@/components/shop/contact-form";
import { getShop } from "@/lib/data/server";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.common.nav.contact, description: t.shop.contact.subtitle };
}

export default async function ContactPage() {
  const [{ t, locale }, { stores: pickupStores, contact }] = await Promise.all([getT(), getShop()]);
  const c = t.shop.contact;
  const channels = [
    { icon: Phone, title: c.callTitle, desc: c.callDesc, value: contact.phone, href: contact.phoneHref },
    { icon: WhatsAppIcon, title: c.whatsappTitle, desc: c.whatsappDesc, value: contact.phone, href: `https://wa.me/${contact.whatsapp}` },
    { icon: Mail, title: c.emailTitle, desc: c.emailDesc, value: contact.email, href: `mailto:${contact.email}` },
    { icon: MapPin, title: c.visitTitle, desc: contact.address, value: pickupStores[0]?.name ?? "", href: pickupStores[0]?.mapUrl ?? "#" },
  ];

  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle} />
      <div className="container-page -mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {channels.map((ch) => (
          <a
            key={ch.title}
            href={ch.href}
            target={ch.href.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
            className="group relative rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary transition group-hover:bg-primary group-hover:text-white">
              <ch.icon className="size-5" />
            </span>
            <p className="mt-4 font-semibold">{ch.title}</p>
            <p className="text-xs text-muted-foreground">{ch.desc}</p>
            <p className="mt-2 text-sm font-medium">{ch.value}</p>
          </a>
        ))}
      </div>

      <section className="container-page grid gap-8 py-16 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-[28px] border border-border bg-card p-6 sm:p-10">
          <h2 className="mb-6 text-2xl font-semibold">{c.formTitle}</h2>
          <ContactForm />
        </div>
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[28px] border border-border bg-card">
            <iframe
              title="Joh Shopping Kariakoo"
              src="https://maps.google.com/maps?q=Kariakoo%20Dar%20es%20Salaam&z=15&output=embed"
              className="h-72 w-full grayscale-[0.4]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="rounded-[28px] border border-border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <Clock className="size-5 text-primary" />
              {c.hoursTitle}
            </h3>
            <ul className="space-y-3 text-sm">
              {pickupStores.map((s) => (
                <li key={s.id} className="flex justify-between gap-4">
                  <span className="font-medium">{s.name.replace("Joh Shopping ", "")}</span>
                  <span className="text-right text-muted-foreground">{s.hours[locale]}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link href="/faq" className="block rounded-[28px] bg-neutral-950 p-6 text-white transition hover:bg-neutral-900">
            <p className="font-semibold">{t.common.nav.faq}</p>
            <p className="mt-1 text-sm text-white/60">{c.faqCta} →</p>
          </Link>
        </div>
      </section>
    </>
  );
}
