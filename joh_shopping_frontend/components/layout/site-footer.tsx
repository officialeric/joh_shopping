"use client";

import { ArrowUp, Mail, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { useMounted } from "@/lib/hooks";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { FacebookIcon, InstagramIcon, TikTokIcon, WhatsAppIcon, XIcon, YouTubeIcon } from "@/components/brand/icons";
import { PaymentMark, ONLINE_METHODS } from "@/components/brand/payment-logos";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { useShop } from "@/lib/data/shop-context";
import { apiErrorMessage } from "@/lib/api/errors";
import { useT } from "@/lib/i18n/client";
import { subscribe } from "@/lib/api/shop";
import { LanguageSwitcher } from "./switchers";

export function SiteFooter() {
  const { categories, contact } = useShop();
  const { t, locale } = useT();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const columns = [
    {
      title: t.common.footer.shop,
      links: [
        ...categories.slice(0, 5).map((c) => ({ href: `/products?category=${c.slug}`, label: c.name[locale] })),
        { href: "/deals", label: t.common.nav.deals },
        { href: "/brands", label: t.common.nav.brands },
      ],
    },
    {
      title: t.common.footer.help,
      links: [
        { href: "/track-order", label: t.common.nav.trackOrder },
        { href: "/faq", label: t.common.nav.faq },
        { href: "/policies/shipping", label: t.common.policies.shipping },
        { href: "/policies/returns", label: t.common.policies.returns },
        { href: "/policies/warranty", label: t.common.policies.warranty },
        { href: "/compare", label: t.common.nav.compare },
      ],
    },
    {
      title: t.common.footer.company,
      links: [
        { href: "/about", label: t.common.nav.about },
        { href: "/contact", label: t.common.nav.contact },
        { href: "/policies/privacy", label: t.common.policies.privacy },
        { href: "/policies/terms", label: t.common.policies.terms },
        { href: "/admin", label: "Admin" },
      ],
    },
  ];

  const socials = [
    { icon: InstagramIcon, label: "Instagram", href: "https://instagram.com" },
    { icon: TikTokIcon, label: "TikTok", href: "https://tiktok.com" },
    { icon: FacebookIcon, label: "Facebook", href: "https://facebook.com" },
    { icon: XIcon, label: "X", href: "https://x.com" },
    { icon: YouTubeIcon, label: "YouTube", href: "https://youtube.com" },
  ];

  return (
    <footer className="mt-24 bg-neutral-950 text-white">
      <div className="container-page">
        <div className="relative -translate-y-1/2 overflow-hidden rounded-3xl bg-brand-gradient p-6 shadow-glow sm:p-10">
          <div className="absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative grid items-center gap-6 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">{t.common.footer.newsletterTitle}</h2>
              <p className="mt-2 text-white/80">{t.common.footer.newsletterDesc}</p>
            </div>
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error(t.common.validation.email);
                setLoading(true);
                try {
                  await subscribe(email);
                  setEmail("");
                  toast.success(t.common.footer.subscribed);
                } catch (err) {
                  toast.error(apiErrorMessage(err, t));
                } finally {
                  setLoading(false);
                }
              }}
            >
              <label htmlFor="newsletter-email" className="sr-only">
                {t.common.footer.newsletterPlaceholder}
              </label>
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.common.footer.newsletterPlaceholder}
                className="h-12 flex-1 rounded-full border border-white/20 bg-white/10 px-5 text-sm text-white outline-none placeholder:text-white/60 focus:border-white/60 focus:bg-white/15"
              />
              <Button type="submit" variant="white" size="lg" loading={loading}>
                {t.common.footer.subscribe}
              </Button>
            </form>
          </div>
        </div>

        <div className="-mt-6 grid gap-10 pb-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-5">
            <Logo inverted />
            <p className="max-w-sm text-sm leading-relaxed text-white/60">{t.common.footer.about}</p>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 text-brand-400" />
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hover:text-white">
                  {contact.phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 text-brand-400" />
                <a href={`mailto:${contact.email}`} className="hover:text-white">
                  {contact.email}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="size-4 text-brand-400" />
                {contact.address}
              </li>
            </ul>
            <div className="flex gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="flex size-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-brand-500 hover:bg-brand-600 hover:text-white"
                >
                  <s.icon className="size-4" />
                </a>
              ))}
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="mb-4 text-sm font-semibold tracking-wide">{col.title}</h3>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-white/60 transition hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-white/50">{t.common.footer.weAccept}</span>
            {ONLINE_METHODS.map((m) => (
              <PaymentMark key={m} method={m} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-white/50">
            <span>
              © <CurrentYear /> {t.common.brand.name}. {t.common.footer.rights}
            </span>
            <span className="hidden sm:inline">{t.common.footer.madeIn} 🇹🇿</span>
            <LanguageSwitcher variant="topbar" />
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex size-8 items-center justify-center rounded-full border border-white/15 hover:bg-white/10"
              aria-label={t.common.misc.backToTop}
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

/** Read the clock after mount so the footer can be prerendered. */
function CurrentYear() {
  const mounted = useMounted();
  return <>{mounted ? new Date().getFullYear() : null}</>;
}

export function WhatsAppButton() {
  const { contact } = useShop();
  const { t } = useT();
  return (
    <a
      href={`https://wa.me/${contact.whatsapp}`}
      target="_blank"
      rel="noreferrer"
      aria-label={t.common.misc.whatsappChat}
      className="group fixed right-4 bottom-4 z-30 hidden items-center gap-2 rounded-full bg-[#25d366] p-3.5 text-white shadow-lift transition hover:scale-105 sm:right-6 sm:bottom-6 sm:flex"
    >
      <WhatsAppIcon className="size-6" />
      <span className="hidden max-w-0 overflow-hidden text-sm font-semibold whitespace-nowrap transition-all duration-300 group-hover:max-w-48 sm:inline">
        {t.common.misc.whatsappChat}
      </span>
    </a>
  );
}
