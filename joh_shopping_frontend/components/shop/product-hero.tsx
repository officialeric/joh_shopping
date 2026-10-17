"use client";

import {
  BadgeCheck,
  BatteryFull,
  Bell,
  GitCompare,
  Heart,
  RotateCcw,
  Share2,
  ShieldCheck,
  Store,
  Truck,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Product } from "@/types";
import { WhatsAppIcon } from "@/components/brand/icons";
import { PaymentMark, ONLINE_METHODS } from "@/components/brand/payment-logos";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, QuantityInput } from "@/components/ui/form-controls";
import { Link } from "@/components/ui/link";
import { Rating } from "@/components/ui/primitives";
import { useShop } from "@/lib/data/shop-context";
import { shippingFee, unitPrice, zoneForRegion } from "@/lib/cart";
import { useLocalizedRouter, useT } from "@/lib/i18n/client";
import { requestStockAlert } from "@/lib/api/shop";
import { useNow } from "@/lib/hooks";
import { cn, discountPercent, fmt, formatDate, formatTZS } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api/errors";
import { useCompare, useHydrated, useRecent, useStockAlerts, useWishlist } from "@/stores";
import { ProductGallery } from "./product-gallery";
import { ProductImage } from "./product-card";
import { Price } from "./price";
import { useProductActions } from "./product-actions";

export function ProductHero({ product }: { product: Product }) {
  const { t, locale } = useT();
  const router = useLocalizedRouter();
  const hydrated = useHydrated();
  const actions = useProductActions();
  const inWishlist = useWishlist((s) => s.ids.includes(product.id));
  const inCompare = useCompare((s) => s.ids.includes(product.id));
  const pushRecent = useRecent((s) => s.push);
  const alerts = useStockAlerts();
  const { getBrand, regions: tzRegions, zones, contact, flashSale } = useShop();
  const brand = getBrand(product.brandId);
  const now = useNow();

  const firstInStock = product.variants.find((v) => v.stock > 0) ?? product.variants[0]!;
  const [color, setColor] = useState(firstInStock.color);
  const [storage, setStorage] = useState(firstInStock.storage);
  const [qty, setQty] = useState(1);
  const [region, setRegion] = useState("Dar es Salaam");
  const [alertEmail, setAlertEmail] = useState("");
  const buyRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => pushRecent(product.id), [product.id, pushRecent]);
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setShowSticky(!entry!.isIntersecting && entry!.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const variant = useMemo(
    () => product.variants.find((v) => v.color === color && (product.storages.length === 0 || v.storage === storage)),
    [product, color, storage],
  );
  const stock = variant?.stock ?? 0;
  const colorName = product.colors.find((c) => c.hex === color)?.name[locale];
  // A live flash sale lowers every variant by the same amount; show the regular price struck through.
  const regular = variant?.price ?? product.price;
  const price = variant ? unitPrice(flashSale, product, variant, now) : regular;
  const compareAt = price < regular ? regular : variant?.compareAtPrice;
  const off = discountPercent(price, compareAt);

  const zone = zoneForRegion(zones, region);
  const fee = shippingFee(zones, region, "standard", price * qty);
  const days = zone?.standardDays ?? "3-4";
  const etaDays = Number(days.split("-").pop()) || 1;
  const eta = now == null ? "" : formatDate(new Date(now + etaDays * 86_400_000), locale, { weekday: "long", day: "numeric", month: "short" });

  const add = (buyNow = false) => {
    if (!variant) return;
    actions.addToCart(product, variant, qty, !buyNow);
    if (buyNow) router.push("/checkout");
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: product.name, url }).catch(() => {});
    else {
      await navigator.clipboard.writeText(url);
      toast.success(t.common.actions.copied);
    }
  };

  const whatsappText = encodeURIComponent(fmt(t.shop.productPage.whatsappMessage, { name: `${product.name} (${colorName ?? ""} ${storage ?? ""})` }));

  return (
    <>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <ProductGallery product={product} color={color} />
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <Link href={`/products?brand=${brand?.slug}`} className="text-xs font-semibold tracking-[0.16em] text-primary uppercase hover:underline">
              {brand?.name}
            </Link>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon-sm" onClick={share} aria-label={t.common.actions.share}>
                <Share2 />
              </Button>
            </div>
          </div>
          <h1 className="mt-2 text-3xl leading-tight font-semibold sm:text-4xl">{product.name}</h1>
          <p className="mt-2 text-muted-foreground">{product.shortDescription[locale]}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <a href="#reviews" className="flex items-center gap-1.5 hover:text-primary">
              <Rating value={product.rating} />
              <span className="font-medium">{product.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({fmt(t.common.product.reviewsCount, { n: product.reviewCount })})</span>
            </a>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{fmt(t.common.product.sold, { n: product.sold.toLocaleString("en-US") })}</span>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <Price price={price} compareAt={compareAt} size="xl" />
              {off > 0 && compareAt && (
                <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
                  {fmt(t.common.product.youSave, { amount: formatTZS(compareAt - price) })}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t.shop.productPage.priceIncludesVat}</p>
          </div>

          {product.condition === "used" && (
            <div className="mt-4 grid gap-3 rounded-2xl border border-border bg-gradient-to-br from-primary-soft/60 to-transparent p-5 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <BadgeCheck className="size-4 text-primary" />
                  {t.common.product.usedBanner}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{t.common.product.usedBannerDesc}</p>
                <p className="mt-3 text-sm">
                  <span className="font-semibold">{fmt(t.common.product.grade, { grade: product.grade ?? "" })}</span>
                  <span className="text-muted-foreground"> — {product.grade && t.common.product.gradeDesc[product.grade]}</span>
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-card p-3 sm:flex-col sm:justify-center">
                <BatteryFull className="size-6 text-success" />
                <div className="sm:text-center">
                  <p className="font-display text-2xl font-semibold">{product.batteryHealth}%</p>
                  <p className="text-xs text-muted-foreground">{t.common.product.batteryHealth}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-6">
            {product.colors.length > 0 && (
              <div>
                <p className="mb-3 text-sm">
                  <span className="font-semibold">{t.common.product.color}:</span> <span className="text-muted-foreground">{colorName}</span>
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {product.colors.map((c) => {
                    const available = product.variants.some((v) => v.color === c.hex && v.stock > 0);
                    return (
                      <button
                        key={c.hex}
                        onClick={() => setColor(c.hex)}
                        className={cn(
                          "relative flex items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-1.5 text-sm transition",
                          color === c.hex ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground/40",
                          !available && "opacity-50",
                        )}
                        aria-pressed={color === c.hex}
                      >
                        <span className="size-6 rounded-full border border-black/10" style={{ background: c.hex }} />
                        {c.name[locale]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {product.storages.length > 0 && (
              <div>
                <p className="mb-3 text-sm font-semibold">
                  {t.common.product.storage}
                  {product.rams[0] && <span className="font-normal text-muted-foreground"> · {product.rams[0]} RAM</span>}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:max-w-md">
                  {product.storages.map((s) => {
                    const v = product.variants.find((x) => x.color === color && x.storage === s);
                    const available = !!v && v.stock > 0;
                    return (
                      <button
                        key={s}
                        onClick={() => setStorage(s)}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-left transition",
                          storage === s ? "border-primary bg-primary-soft/60 ring-1 ring-primary" : "border-border hover:border-foreground/40",
                          !available && "opacity-50",
                        )}
                        aria-pressed={storage === s}
                      >
                        <span className="block text-sm font-semibold">{s}</span>
                        {v && <span className="block text-xs text-muted-foreground">{formatTZS(v.price, { compact: true })}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div ref={buyRef} className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                {stock > 0 ? (
                  <span className={cn("flex items-center gap-2 font-medium", stock <= product.lowStockThreshold ? "text-warning" : "text-success")}>
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
                      <span className="relative inline-flex size-2 rounded-full bg-current" />
                    </span>
                    {stock <= product.lowStockThreshold ? fmt(t.common.product.lowStock, { n: stock }) : t.common.product.inStock}
                  </span>
                ) : (
                  <span className="font-medium text-destructive">{variant ? t.common.product.outOfStock : t.shop.productPage.variantUnavailable}</span>
                )}
                {variant && <span className="text-xs text-muted-foreground">SKU: {variant.sku}</span>}
              </div>

              {stock > 0 ? (
                <div className="flex flex-wrap gap-2">
                  <QuantityInput value={qty} onChange={setQty} max={stock} />
                  <Button size="lg" className="flex-1" onClick={() => add(false)}>
                    {t.common.actions.addToCart}
                  </Button>
                  <Button size="lg" variant="secondary" className="flex-1" onClick={() => add(true)}>
                    <Zap />
                    {t.common.actions.buyNow}
                  </Button>
                </div>
              ) : (
                <form
                  className="flex gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!/^\S+@\S+\.\S+$/.test(alertEmail)) return toast.error(t.common.validation.email);
                    try {
                      await requestStockAlert(product.id, alertEmail);
                      alerts.push(product.id);
                      toast.success(t.common.product.notifySet);
                    } catch (err) {
                      toast.error(apiErrorMessage(err, t));
                    }
                  }}
                >
                  <Input type="email" placeholder={t.common.misc.email} value={alertEmail} onChange={(e) => setAlertEmail(e.target.value)} className="flex-1" />
                  <Button size="lg" type="submit" disabled={hydrated && alerts.ids.includes(product.id)}>
                    <Bell />
                    {t.common.product.notifyMe}
                  </Button>
                </form>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="min-w-0 flex-1" onClick={() => actions.toggleWishlist(product)} aria-pressed={hydrated && inWishlist}>
                  <Heart className={cn(hydrated && inWishlist && "fill-primary text-primary")} />
                  <span className="truncate">{hydrated && inWishlist ? t.common.product.removeFromWishlist : t.common.product.addToWishlist}</span>
                </Button>
                <Button variant="outline" onClick={() => actions.toggleCompare(product)} aria-pressed={hydrated && inCompare} className={cn(hydrated && inCompare && "border-primary text-primary")}>
                  <GitCompare />
                  {t.common.product.addToCompare}
                </Button>
              </div>
            </div>

            <div className="divide-y divide-border rounded-2xl border border-border bg-card">
              <div className="flex gap-4 p-4">
                <Truck className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold">{t.shop.productPage.checkDelivery}</p>
                  <NativeSelect value={region} onChange={(e) => setRegion(e.target.value)} className="h-9 text-sm" aria-label={t.shop.productPage.selectRegion}>
                    {tzRegions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </NativeSelect>
                  <p className="text-sm text-muted-foreground">
                    {fmt(t.shop.productPage.deliveryTo, { fee: fee === 0 ? t.shop.productPage.freeDelivery : formatTZS(fee ?? 0), days })} ·{" "}
                    <span className="text-foreground">{fmt(t.common.product.deliveryEstimate, { date: eta })}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-4 p-4">
                <Store className="mt-0.5 size-5 shrink-0 text-primary" />
                <p className="text-sm">{t.common.product.pickupAvailable}</p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border">
                {[
                  { icon: BadgeCheck, label: t.common.product.genuine },
                  { icon: ShieldCheck, label: fmt(t.common.product.warranty, { n: product.warrantyMonths }) },
                  { icon: RotateCcw, label: t.common.product.returns7 },
                ].map((b) => (
                  <div key={b.label} className="flex flex-col items-center gap-1.5 p-3 text-center">
                    <b.icon className="size-5 text-muted-foreground" />
                    <span className="text-xs font-medium">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <a
                href={`https://wa.me/${contact.whatsapp}?text=${whatsappText}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#128c4a] hover:underline dark:text-[#25d366]"
              >
                <WhatsAppIcon className="size-4" />
                {t.shop.productPage.askWhatsapp}
              </a>
              <div className="flex flex-wrap gap-1">
                {ONLINE_METHODS.slice(0, 4).map((m) => (
                  <PaymentMark key={m} method={m} className="h-5 min-w-10 text-[8px]" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background/95 p-3 backdrop-blur-xl transition-transform duration-300 md:bottom-0",
          showSticky && stock > 0 ? "translate-y-0" : "pointer-events-none translate-y-[200%]",
        )}
      >
        <div className="container-page flex items-center gap-3">
          <div className="hidden size-12 shrink-0 rounded-xl bg-surface p-1 sm:block">
            <ProductImage product={product} color={color} view={product.art.kind === "phone" ? "back" : undefined} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{product.name}</p>
            <p className="truncate text-xs text-muted-foreground">{[colorName, storage].filter(Boolean).join(" · ")}</p>
          </div>
          <Price price={price} size="md" className="hidden sm:flex" />
          <Button onClick={() => add(false)}>{t.shop.productPage.stickyAdd}</Button>
        </div>
      </div>
    </>
  );
}
