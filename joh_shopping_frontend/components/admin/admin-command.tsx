"use client";

import { ArrowRight, Package, Search, ShoppingCart, User } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useState } from "react";
import { list } from "@/lib/api/core";
import { useLocalizedRouter, useT } from "@/lib/i18n/client";
import { formatTZS } from "@/lib/utils";
import { useAdmin, useAdminNav } from "./admin-shell";

interface Hit {
  id: string;
  group: string;
  label: string;
  hint?: string;
  href: string;
  icon: typeof Package;
}

/** ⌘K palette: jump to pages, orders, products and customers. */
export function AdminCommand({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useT();
  const router = useLocalizedRouter();
  const { groups } = useAdminNav();
  const { can } = useAdmin();
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim().toLowerCase());

  // Server-side search across the collections this staff member can open.
  const { data: found } = useQuery({
    queryKey: ["admin", "command", query],
    enabled: open && query.length >= 2,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = { search: query, perPage: 5 };
      const [orders, products, customers] = await Promise.all([
        can("orders.view") || can("orders.manage") ? list("orders", params).then((r) => r.data) : [],
        can("products.manage") ? list("products", params).then((r) => r.data) : [],
        can("customers.manage") ? list("customers", params).then((r) => r.data) : [],
      ]);
      return { orders, products, customers };
    },
  });

  const hits = useMemo<Hit[]>(() => {
    const pages: Hit[] = groups
      .flatMap((g) => g.items)
      .filter((i) => can(i.perm) && (!query || i.label.toLowerCase().includes(query)))
      .map((i) => ({ id: i.href, group: t.admin.panel, label: i.label, href: i.href, icon: i.icon }));
    if (query.length < 2 || !found) return pages.slice(0, 8);
    const orders: Hit[] = found.orders.map((o) => ({ id: o.id, group: t.admin.nav.orders, label: o.number, hint: `${o.customerName} · ${formatTZS(o.total)}`, href: `/admin/orders/${o.id}`, icon: ShoppingCart }));
    const products: Hit[] = found.products.map((p) => ({ id: p.id, group: t.admin.nav.products, label: p.name, hint: formatTZS(p.price), href: `/admin/products/${p.id}`, icon: Package }));
    const customers: Hit[] = found.customers.map((c) => ({ id: c.id, group: t.admin.nav.customers, label: c.name, hint: c.email, href: `/admin/customers/${c.id}`, icon: User }));
    return [...pages.slice(0, 4), ...orders, ...products, ...customers];
  }, [query, groups, can, t, found]);

  const go = (href: string) => {
    onOpenChange(false);
    setQ("");
    router.push(href);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-[fade-in_0.2s_ease-out]" />
        <DialogPrimitive.Content className="fixed inset-x-0 top-[12vh] z-50 mx-auto w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-2xl border border-border bg-popover shadow-lift outline-none data-[state=open]:animate-[fade-up_0.2s_ease-out]">
          <DialogPrimitive.Title className="sr-only">{t.admin.topbar.search}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{t.admin.topbar.search}</DialogPrimitive.Description>
          <form
            className="flex items-center gap-3 border-b border-border px-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (hits[0]) go(hits[0].href);
            }}
          >
            <Search className="size-4 text-muted-foreground" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.admin.topbar.search} className="h-14 flex-1 bg-transparent text-sm outline-none" />
          </form>
          <ul className="max-h-[50vh] overflow-y-auto p-2">
            {hits.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">{t.common.misc.noResults}</li>}
            {hits.map((h, i) => {
              const header = i === 0 || hits[i - 1]!.group !== h.group ? h.group : null;
              return (
                <li key={`${h.group}-${h.id}`}>
                  {header && <p className="px-3 pt-3 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{header}</p>}
                  <button onClick={() => go(h.href)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-accent">
                    <h.icon className="size-4 text-muted-foreground" />
                    <span className="flex-1 truncate font-medium">{h.label}</span>
                    {h.hint && <span className="truncate text-xs text-muted-foreground">{h.hint}</span>}
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                  </button>
                </li>
              );
            })}
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
