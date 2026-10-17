import { ArrowLeft, Search } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ProductArt } from "@/components/brand/product-art";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="container-page flex h-16 items-center">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="container-page flex flex-1 flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-8 h-48 w-48">
          <div className="absolute inset-0 rounded-full bg-primary/10 blur-3xl" />
          <ProductArt kind="phone" camera="trio-square" color="#2b2b2d" view="front" className="relative -rotate-12" />
        </div>
        <p className="font-display text-7xl font-bold text-primary">404</p>
        <h1 className="mt-3 text-3xl font-semibold">{t.common.misc.notFoundTitle}</h1>
        <p className="mt-2 max-w-md text-muted-foreground">{t.common.misc.notFoundDesc}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/">
              <ArrowLeft />
              {t.common.actions.goHome}
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/products">
              <Search />
              {t.common.nav.products}
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
