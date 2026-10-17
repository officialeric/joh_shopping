"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Check, MessageCircleQuestion, PackageOpen, Plus, ThumbsUp } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form-controls";
import { Link } from "@/components/ui/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/overlays";
import { Progress, Rating, RatingInput, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { ratingBreakdown } from "@/lib/data/catalog";
import { useShop } from "@/lib/data/shop-context";
import { askQuestion, questionsFor, reviewsFor, submitReview } from "@/lib/api/shop";
import { apiErrorMessage } from "@/lib/api/errors";
import { useT } from "@/lib/i18n/client";
import { cn, fmt, formatDate, formatTZS } from "@/lib/utils";
import { useAuth, useCart, useHydrated, useRecent, useUI } from "@/stores";
import { ProductImage } from "./product-card";
import { ProductRail } from "./product-rail";

export function ProductTabs({ product }: { product: Product }) {
  const { t, locale } = useT();
  return (
    <Tabs defaultValue="description" id="reviews">
      <TabsList variant="line" className="mb-8">
        <TabsTrigger value="description">{t.common.product.description}</TabsTrigger>
        <TabsTrigger value="specs">{t.common.product.specs}</TabsTrigger>
        <TabsTrigger value="reviews">
          {t.common.product.reviews} <span className="rounded-full bg-muted px-2 text-xs">{product.reviewCount}</span>
        </TabsTrigger>
        <TabsTrigger value="qa">{t.common.product.qa}</TabsTrigger>
      </TabsList>

      <TabsContent value="description">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-lg leading-relaxed text-muted-foreground">{product.description[locale]}</p>
            <h3 className="mt-8 mb-4 text-lg font-semibold">{t.common.product.highlights}</h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {product.highlights.map((h) => (
                <li key={h.en} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  <span className="text-sm font-medium">{h[locale]}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <PackageOpen className="size-5 text-primary" />
              {t.common.product.inBox}
            </h3>
            <ul className="space-y-3">
              {product.inBox.map((item) => (
                <li key={item.en} className="flex items-center gap-3 text-sm">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {item[locale]}
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-2xl bg-muted p-4 text-sm">
              <p className="font-semibold">{fmt(t.common.product.warranty, { n: product.warrantyMonths })}</p>
              <Link href="/policies/warranty" className="text-primary hover:underline">
                {t.common.policies.warranty} →
              </Link>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="specs">
        <div className="grid gap-6 lg:grid-cols-2">
          {product.specs.map((group) => (
            <div key={group.group.en} className="overflow-hidden rounded-2xl border border-border bg-card">
              <h3 className="border-b border-border bg-muted/60 px-5 py-3 text-sm font-semibold">{group.group[locale]}</h3>
              <dl className="divide-y divide-border">
                {group.items.map((item) => (
                  <div key={item.label.en} className="grid grid-cols-[40%_1fr] gap-4 px-5 py-3 text-sm">
                    <dt className="text-muted-foreground">{item.label[locale]}</dt>
                    <dd className="font-medium">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
        {product.categoryId === "c-phones" && (
          <Button variant="outline" className="mt-6" asChild>
            <Link href="/compare">{t.shop.productPage.specsCompare}</Link>
          </Button>
        )}
      </TabsContent>

      <TabsContent value="reviews">
        <Reviews product={product} />
      </TabsContent>

      <TabsContent value="qa">
        <Questions product={product} />
      </TabsContent>
    </Tabs>
  );
}

function Reviews({ product }: { product: Product }) {
  const { t, locale } = useT();
  const { data, isLoading } = useQuery({ queryKey: ["reviews", product.id], queryFn: () => reviewsFor(product.id) });
  const breakdown = ratingBreakdown(product);
  const [showAll, setShowAll] = useState(false);
  const list = showAll ? data : data?.slice(0, 4);

  return (
    <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
      <div className="h-fit rounded-3xl border border-border bg-card p-6 lg:sticky lg:top-24">
        <p className="text-sm font-semibold">{t.shop.productPage.reviewsSummary}</p>
        <div className="mt-3 flex items-end gap-3">
          <span className="font-display text-5xl font-semibold">{product.rating.toFixed(1)}</span>
          <div className="pb-1.5">
            <Rating value={product.rating} size="md" />
            <p className="mt-1 text-xs text-muted-foreground">{fmt(t.common.product.basedOn, { n: product.reviewCount })}</p>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          {breakdown.map((count, i) => (
            <div key={i} className="flex items-center gap-3 text-xs">
              <span className="w-3 text-muted-foreground">{5 - i}</span>
              <Progress value={(count / Math.max(1, product.reviewCount)) * 100} className="h-1.5" indicatorClassName="bg-amber-400" />
              <span className="w-8 text-right text-muted-foreground tabular-nums">{count}</span>
            </div>
          ))}
        </div>
        <ReviewDialog product={product} />
      </div>
      <div>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : !data?.length ? (
          <p className="text-muted-foreground">{t.common.product.noReviews}</p>
        ) : (
          <div className="divide-y divide-border">
            {list?.map((r) => (
              <article key={r.id} className="py-6 first:pt-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Rating value={r.rating} />
                      <h4 className="text-sm font-semibold">{r.title}</h4>
                    </div>
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {r.customerName} · {formatDate(r.createdAt, locale)}
                      {r.verified && (
                        <span className="inline-flex items-center gap-1 text-success">
                          <BadgeCheck className="size-3.5" />
                          {t.common.product.verifiedPurchase}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed">{r.body}</p>
                {r.reply && <p className="mt-3 rounded-xl bg-muted p-3 text-sm">{r.reply}</p>}
                <button className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <ThumbsUp className="size-3.5" />
                  {fmt(t.common.product.helpful, { n: r.helpful })}
                </button>
              </article>
            ))}
          </div>
        )}
        {data && data.length > 4 && (
          <Button variant="outline" className="mt-4" onClick={() => setShowAll((s) => !s)}>
            {showAll ? t.common.actions.showLess : t.shop.productPage.seeAllReviews}
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewDialog({ product }: { product: Product }) {
  const { t } = useT();
  const user = useAuth((s) => s.user);
  const hydrated = useHydrated();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  if (!hydrated || !user) {
    return (
      <Button variant="outline" className="mt-6 w-full" asChild>
        <Link href="/login">{t.shop.productPage.loginToReview}</Link>
      </Button>
    );
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="mt-6 w-full">{t.common.product.writeReview}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.common.product.writeReview}</DialogTitle>
          <DialogDescription>{product.name}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (body.trim().length < 10) return toast.error(fmt(t.common.validation.min, { n: 10 }));
            setLoading(true);
            try {
              await submitReview({ productId: product.id, rating, title: title || "—", body });
            } catch (err) {
              toast.error(apiErrorMessage(err, t));
              return;
            } finally {
              setLoading(false);
            }
            setOpen(false);
            setTitle("");
            setBody("");
            qc.invalidateQueries({ queryKey: ["reviews", product.id] });
            toast.success(t.common.product.reviewSent);
          }}
        >
          <Field label={t.common.product.yourRating}>
            <RatingInput value={rating} onChange={setRating} />
          </Field>
          <Field label={t.common.product.reviewTitle} htmlFor="rv-title">
            <Input id="rv-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label={t.common.product.reviewBody} htmlFor="rv-body">
            <Textarea id="rv-body" value={body} onChange={(e) => setBody(e.target.value)} required />
          </Field>
          <Button type="submit" loading={loading}>
            {t.common.actions.submit}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Questions({ product }: { product: Product }) {
  const { t, locale } = useT();
  const user = useAuth((s) => s.user);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [asked, setAsked] = useState<string[]>([]);
  const { data: items = [] } = useQuery({ queryKey: ["questions", product.id], queryFn: () => questionsFor(product.id) });
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {[...asked.map((question, i) => ({ id: `new-${i}`, question, answer: undefined, askedBy: user?.name ?? "—", createdAt: "" })), ...items].map((item) => (
          <div key={item.id} className="rounded-2xl border border-border bg-card p-5">
            <p className="flex gap-3 font-medium">
              <span className="font-display text-primary">Q</span>
              {item.question}
            </p>
            {item.answer ? (
              <div className="mt-3 flex gap-3 text-sm">
                <span className="font-display font-semibold text-muted-foreground">A</span>
                <div>
                  <p>{item.answer}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.shop.productPage.answeredBy}
                    {item.createdAt && ` · ${formatDate(item.createdAt, locale)}`}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-2 pl-6 text-xs text-muted-foreground">{t.shop.productPage.awaitingAnswer}</p>
            )}
          </div>
        ))}
      </div>
      <form
        className="h-fit space-y-3 rounded-3xl border border-border bg-card p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (q.trim().length < 5) return;
          setLoading(true);
          try {
            await askQuestion(product.id, q);
          } catch (err) {
            toast.error(apiErrorMessage(err, t));
            return;
          } finally {
            setLoading(false);
          }
          setAsked((a) => [q, ...a]);
          setQ("");
          toast.success(t.common.product.questionSent);
        }}
      >
        <p className="flex items-center gap-2 font-semibold">
          <MessageCircleQuestion className="size-5 text-primary" />
          {t.common.product.askQuestion}
        </p>
        <Textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.common.product.questionPlaceholder} />
        <Button type="submit" className="w-full" loading={loading}>
          {t.common.actions.send}
        </Button>
      </form>
    </div>
  );
}

export function BoughtTogether({ product, extras }: { product: Product; extras: Product[] }) {
  const { t } = useT();
  const add = useCart((s) => s.add);
  const setCartOpen = useUI((s) => s.setCartOpen);
  const all = [product, ...extras];
  const [selected, setSelected] = useState<string[]>(all.map((p) => p.id));
  const total = all.filter((p) => selected.includes(p.id)).reduce((s, p) => s + p.price, 0);
  if (extras.length === 0) return null;

  return (
    <section className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
      <h2 className="mb-6 text-xl font-semibold sm:text-2xl">{t.common.product.boughtTogether}</h2>
      <div className="grid items-center gap-6 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-wrap items-center gap-3">
          {all.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3">
              <label
                className={cn(
                  "relative block w-32 cursor-pointer rounded-2xl border-2 bg-surface p-3 transition sm:w-40",
                  selected.includes(p.id) ? "border-primary" : "border-transparent opacity-60",
                )}
              >
                <Checkbox
                  className="absolute top-2 left-2 z-10"
                  checked={selected.includes(p.id)}
                  onCheckedChange={(c) => setSelected((s) => (c ? [...s, p.id] : s.filter((x) => x !== p.id)))}
                  aria-label={p.name}
                />
                <div className="aspect-square">
                  <ProductImage product={p} view={p.art.kind === "phone" ? "back" : undefined} />
                </div>
                <p className="mt-2 line-clamp-1 text-xs font-medium">{i === 0 ? `${t.common.product.thisItem}: ` : ""}{p.name}</p>
                <p className="text-xs font-semibold">{formatTZS(p.price)}</p>
              </label>
              {i < all.length - 1 && <Plus className="size-5 shrink-0 text-muted-foreground" />}
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-muted p-5">
          <p className="text-sm text-muted-foreground">{t.common.product.totalPrice}</p>
          <p className="font-display text-2xl font-semibold">{formatTZS(total)}</p>
          <Button
            className="mt-4 w-full"
            disabled={selected.length === 0}
            onClick={() => {
              all.filter((p) => selected.includes(p.id)).forEach((p) => {
                const v = p.variants.find((x) => x.stock > 0) ?? p.variants[0]!;
                add({ productId: p.id, variantId: v.id, qty: 1 });
              });
              setCartOpen(true);
            }}
          >
            {t.common.product.addAllToCart}
          </Button>
        </div>
      </div>
    </section>
  );
}

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const { t } = useT();
  const hydrated = useHydrated();
  const ids = useRecent((s) => s.ids);
  const { getProduct } = useShop();
  const products = useMemo(() => ids.filter((id) => id !== excludeId).map((id) => getProduct(id)).filter((p): p is Product => !!p), [ids, excludeId, getProduct]);
  if (!hydrated || products.length === 0) return null;
  return (
    <section>
      <h2 className="mb-6 text-2xl font-semibold">{t.common.product.recentlyViewed}</h2>
      <ProductRail products={products} />
    </section>
  );
}
