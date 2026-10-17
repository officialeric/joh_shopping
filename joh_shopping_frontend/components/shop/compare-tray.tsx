"use client";

import { GitCompare, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { useShop } from "@/lib/data/shop-context";
import { useT } from "@/lib/i18n/client";
import { fmt } from "@/lib/utils";
import { COMPARE_LIMIT, useCompare, useHydrated } from "@/stores";
import { ProductImage } from "./product-card";

/** Floating bar listing products queued for comparison. */
export function CompareTray() {
  const { getProduct } = useShop();
  const { t } = useT();
  const hydrated = useHydrated();
  const ids = useCompare((s) => s.ids);
  const remove = useCompare((s) => s.remove);
  const clear = useCompare((s) => s.clear);
  const pathname = usePathname();
  if (!hydrated || ids.length === 0 || pathname.endsWith("/compare") || pathname.includes("/checkout")) return null;
  const products = ids.map((id) => getProduct(id)).filter((p) => !!p);

  return (
    <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 sm:bottom-6">
      <div className="flex animate-[fade-up_0.3s_ease-out] items-center gap-3 rounded-full border border-border bg-popover/95 p-2 pl-4 shadow-lift backdrop-blur-xl">
        <GitCompare className="hidden size-4 text-primary sm:block" />
        <div className="flex items-center gap-1.5">
          {products.map((p) => (
            <div key={p.id} className="group relative size-10 rounded-full bg-surface p-1 ring-1 ring-border">
              <ProductImage product={p} view={p.art.kind === "phone" ? "back" : undefined} />
              <button
                onClick={() => remove(p.id)}
                className="absolute -top-1 -right-1 hidden size-4 items-center justify-center rounded-full bg-foreground text-background group-hover:flex"
                aria-label={t.common.actions.remove}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          {Array.from({ length: COMPARE_LIMIT - products.length }).map((_, i) => (
            <div key={i} className="size-10 rounded-full border border-dashed border-border" />
          ))}
        </div>
        <Button size="sm" asChild>
          <Link href="/compare">{fmt(t.common.compare.tray, { n: products.length })}</Link>
        </Button>
        <button onClick={clear} className="rounded-full p-1.5 text-muted-foreground hover:bg-accent" aria-label={t.common.actions.clearAll}>
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
