import { Lock } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Link } from "@/components/ui/link";
import { getT } from "@/lib/i18n/server";

/** Distraction-free layout for checkout and order confirmation. */
export default async function CheckoutLayout({ children }: LayoutProps<"/[lang]">) {
  const { t } = await getT();
  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/" aria-label={t.common.brand.name}>
            <Logo />
          </Link>
          <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Lock className="size-4 text-success" />
            {t.shop.checkout.secure}
          </span>
        </div>
      </header>
      <main className="flex-1 bg-background">{children}</main>
      <footer className="border-t border-border py-6">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{t.common.brand.name}</span>
          <div className="flex gap-4">
            <Link href="/policies/terms" className="hover:text-foreground">
              {t.common.policies.terms}
            </Link>
            <Link href="/policies/privacy" className="hover:text-foreground">
              {t.common.policies.privacy}
            </Link>
            <Link href="/policies/returns" className="hover:text-foreground">
              {t.common.policies.returns}
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
