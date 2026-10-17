"use client";

import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Link } from "@/components/ui/link";
import { Badge, Rating, Skeleton } from "@/components/ui/primitives";
import { AccountHeader, useAccountUser } from "@/components/account/account-shell";
import { useMyOrders } from "@/components/account/order-card";
import { ProductImage } from "@/components/shop/product-card";
import { useShop } from "@/lib/data/shop-context";
import { myReviews } from "@/lib/api/shop";
import { useT } from "@/lib/i18n/client";
import { formatDate } from "@/lib/utils";

export default function MyReviewsPage() {
  const { getProduct } = useShop();
  const { t, locale } = useT();
  const r = t.account.reviews;
  const user = useAccountUser();
  const { data: orders } = useMyOrders();
  const { data: reviews, isLoading } = useQuery({ queryKey: ["my-reviews", user.id], queryFn: () => myReviews() });

  const reviewed = new Set(reviews?.map((x) => x.productId));
  const toReview = Array.from(
    new Map(
      (orders ?? [])
        .filter((o) => o.status === "delivered")
        .flatMap((o) => o.items.map((i) => getProduct(i.productId)))
        .filter((p): p is Product => !!p && !reviewed.has(p.id))
        .map((p) => [p.id, p]),
    ).values(),
  );

  return (
    <>
      <AccountHeader title={r.title} subtitle={r.subtitle} />
      {toReview.length > 0 && (
        <section className="mb-8">
          <h2 className="font-semibold">{r.toReview}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{r.toReviewDesc}</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {toReview.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="size-14 shrink-0 rounded-xl bg-surface p-1">
                  <ProductImage product={p} view={p.art.kind === "phone" ? "back" : undefined} />
                </div>
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</p>
                <Button size="sm" asChild>
                  <Link href={`/products/${p.slug}#reviews`}>
                    <Star />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
      <h2 className="mb-4 font-semibold">{r.written}</h2>
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : !reviews?.length ? (
        <EmptyState icon={<Star />} title={r.empty} className="rounded-[24px] border border-dashed border-border" />
      ) : (
        <div className="space-y-3">
          {reviews.map((rev) => {
            const p = getProduct(rev.productId);
            return (
              <article key={rev.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={p ? `/products/${p.slug}` : "#"} className="font-medium hover:text-primary">
                    {p?.name}
                  </Link>
                  <Badge variant={rev.status === "approved" ? "success" : rev.status === "pending" ? "warning" : "muted"}>
                    {rev.status === "approved" ? r.published : rev.status === "pending" ? r.pending : r.hidden}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Rating value={rev.rating} />
                  <span className="text-sm font-semibold">{rev.title}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{rev.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatDate(rev.createdAt, locale)}</p>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
