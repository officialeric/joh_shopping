"use client";

import { ArrowRight, Search, TrendingUp, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useDeferredValue, useMemo, useState } from "react";
import { useShop } from "@/lib/data/shop-context";
import { useLocalizedRouter, useT } from "@/lib/i18n/client";
import { Link } from "@/components/ui/link";
import { ProductImage } from "@/components/shop/product-card";
import { Price } from "@/components/shop/price";
import { useUI } from "@/stores";

const POPULAR = ["iPhone 16", "Galaxy S25", "AirPods", "Power bank", "Tecno", "Charger"];

export function SearchDialog() {
  const { queryProducts } = useShop();
  const { t } = useT();
  const open = useUI((s) => s.searchOpen);
  const setOpen = useUI((s) => s.setSearchOpen);
  const router = useLocalizedRouter();
  const [q, setQ] = useState("");
  const deferred = useDeferredValue(q);
  const results = useMemo(() => (deferred.trim().length > 1 ? queryProducts({ q: deferred.trim(), sort: "popular" }).slice(0, 6) : []), [deferred, queryProducts]);

  const go = (path: string) => {
    setOpen(false);
    setQ("");
    router.push(path);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-[fade-in_0.2s_ease-out]" />
        <DialogPrimitive.Content className="fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-2xl p-3 outline-none data-[state=open]:animate-[fade-up_0.25s_ease-out] sm:top-[10vh]">
          <DialogPrimitive.Title className="sr-only">{t.common.actions.search}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{t.common.nav.searchHint}</DialogPrimitive.Description>
          <div className="overflow-hidden rounded-3xl border border-border bg-popover shadow-lift">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (q.trim()) go(`/products?q=${encodeURIComponent(q.trim())}`);
              }}
              className="flex items-center gap-3 border-b border-border px-5"
            >
              <Search className="size-5 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.common.nav.searchPlaceholder}
                className="h-16 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
              <DialogPrimitive.Close className="rounded-full p-2 text-muted-foreground hover:bg-accent">
                <X className="size-4" />
              </DialogPrimitive.Close>
            </form>

            <div className="max-h-[60vh] overflow-y-auto p-3">
              {results.length > 0 ? (
                <ul className="grid gap-1">
                  {results.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/products/${p.slug}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-4 rounded-2xl p-2 transition hover:bg-accent"
                      >
                        <div className="size-14 shrink-0 rounded-xl bg-surface p-1">
                          <ProductImage product={p} view={p.art.kind === "phone" ? "back" : undefined} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          <Price price={p.price} compareAt={p.compareAtPrice} size="sm" />
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                  <li>
                    <button
                      onClick={() => go(`/products?q=${encodeURIComponent(q.trim())}`)}
                      className="mt-1 w-full rounded-2xl p-3 text-center text-sm font-medium text-primary hover:bg-primary-soft"
                    >
                      {t.common.nav.searchHint} →
                    </button>
                  </li>
                </ul>
              ) : deferred.trim().length > 1 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">{t.common.misc.noResults}</p>
              ) : (
                <div className="p-3">
                  <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    <TrendingUp className="size-3.5" />
                    {t.common.nav.popularSearches}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR.map((term) => (
                      <button
                        key={term}
                        onClick={() => go(`/products?q=${encodeURIComponent(term)}`)}
                        className="rounded-full border border-border px-3.5 py-1.5 text-sm transition hover:border-primary hover:text-primary"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
