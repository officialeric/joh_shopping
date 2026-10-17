import { MaintenanceGate } from "@/components/layout/maintenance-gate";
import { Check, Quote } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ProductArt } from "@/components/brand/product-art";
import { Link } from "@/components/ui/link";
import { LanguageSwitcher, ThemeToggle } from "@/components/layout/switchers";
import { getT } from "@/lib/i18n/server";

export default async function AuthLayout({ children }: LayoutProps<"/[lang]">) {
  const { t } = await getT();
  const s = t.auth.side;
  return (
    <MaintenanceGate>
      <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
        <div className="flex flex-col px-5 py-6 sm:px-10">
          <header className="flex items-center justify-between">
            <Link href="/" aria-label={t.common.brand.name}>
              <Logo />
            </Link>
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex flex-1 items-center justify-center py-10">
            <div className="w-full max-w-[420px] animate-[fade-up_0.5s_ease-out]">{children}</div>
          </main>
          <footer className="text-center text-xs text-muted-foreground">
            <Link href="/policies/terms" className="hover:text-foreground">
              {t.common.policies.terms}
            </Link>
            {" · "}
            <Link href="/policies/privacy" className="hover:text-foreground">
              {t.common.policies.privacy}
            </Link>
          </footer>
        </div>

        <aside className="relative hidden overflow-hidden bg-brand-gradient p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -top-32 -right-32 size-[420px] rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-20 size-[380px] rounded-full bg-black/30 blur-3xl" />
          <div className="relative">
            <h2 className="max-w-md text-4xl leading-tight font-semibold">{s.headline}</h2>
            <ul className="mt-8 space-y-3.5">
              {s.points.map((p) => (
                <li key={p} className="flex items-center gap-3 text-white/90">
                  <span className="flex size-6 items-center justify-center rounded-full bg-white/15">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mx-auto my-6 aspect-square w-full max-w-sm">
            <ProductArt kind="phone" camera="vertical" color="#26272b" />
          </div>
          <figure className="relative max-w-md rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur">
            <Quote className="size-6 text-white/50" />
            <blockquote className="mt-2 text-lg">{s.quote}</blockquote>
            <figcaption className="mt-3 text-sm text-white/70">{s.quoteBy}</figcaption>
          </figure>
        </aside>
      </div>
    </MaintenanceGate>
  );
}
