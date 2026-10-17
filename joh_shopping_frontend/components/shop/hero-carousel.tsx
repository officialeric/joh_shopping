"use client";

import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Banner } from "@/types";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { useShop } from "@/lib/data/shop-context";
import { useT } from "@/lib/i18n/client";
import { cn, formatTZS } from "@/lib/utils";
import { BannerVisual } from "./banner-visual";

const themes = {
  dark: {
    wrap: "bg-neutral-950 text-white",
    glow: "bg-[radial-gradient(60%_80%_at_75%_50%,rgba(238,47,66,0.45),transparent_70%)]",
    eyebrow: "text-brand-300",
    sub: "text-white/70",
    btn: "default" as const,
  },
  red: {
    wrap: "bg-brand-gradient text-white",
    glow: "bg-[radial-gradient(50%_70%_at_80%_40%,rgba(255,255,255,0.18),transparent_70%)]",
    eyebrow: "text-white/80",
    sub: "text-white/80",
    btn: "white" as const,
  },
  light: {
    wrap: "bg-surface text-foreground",
    glow: "bg-[radial-gradient(50%_70%_at_75%_50%,rgba(238,47,66,0.14),transparent_70%)]",
    eyebrow: "text-primary",
    sub: "text-muted-foreground",
    btn: "secondary" as const,
  },
};

export function HeroCarousel({ banners }: { banners: Banner[] }) {
  const { getProduct } = useShop();
  const { t, locale } = useT();
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, duration: 30 }, [Autoplay({ delay: 6500, stopOnInteraction: false, stopOnMouseEnter: true })]);
  const [index, setIndex] = useState(0);

  const onSelect = useCallback(() => embla && setIndex(embla.selectedScrollSnap()), [embla]);
  useEffect(() => {
    if (!embla) return;
    embla.on("select", onSelect);
    return () => {
      embla.off("select", onSelect);
    };
  }, [embla, onSelect]);

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-3xl sm:rounded-[28px] dark:ring-1 dark:ring-white/10" ref={emblaRef}>
        <div className="flex">
          {banners.map((b, i) => {
            const theme = themes[b.theme];
            const product = b.productId ? getProduct(b.productId) : undefined;
            return (
              <div key={b.id} className="min-w-0 flex-[0_0_100%]">
                {/* Phones: a short card with the picture beside the text, so products show sooner. */}
                <div className={cn("relative grid h-full min-h-[208px] grid-cols-[1.35fr_1fr] overflow-hidden sm:min-h-[400px] md:min-h-[520px] md:grid-cols-2", theme.wrap)}>
                  <div className={cn("absolute inset-0", theme.glow)} />
                  <div className="relative z-10 flex flex-col justify-center gap-2.5 p-5 pb-9 sm:gap-5 sm:p-12 lg:p-16">
                    <p className={cn("hidden text-xs font-semibold tracking-[0.2em] uppercase sm:block", theme.eyebrow)}>{t.shop.home.heroEyebrow}</p>
                    <h2 className="text-2xl leading-[1.08] font-semibold text-balance sm:text-5xl lg:text-6xl">{b.title[locale]}</h2>
                    <p className={cn("line-clamp-2 text-xs sm:line-clamp-none sm:max-w-md sm:text-lg", theme.sub)}>{b.subtitle[locale]}</p>
                    {product && (
                      <p className="text-xs sm:text-sm">
                        <span className={theme.sub}>{t.common.product.from} </span>
                        <span className="font-display text-base font-semibold sm:text-xl">{formatTZS(product.price)}</span>
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 pt-1">
                      <Button size="sm" variant={theme.btn} className="sm:h-12 sm:px-7 sm:text-[15px]" asChild>
                        <Link href={b.href}>
                          {b.cta[locale]}
                          <ArrowRight />
                        </Link>
                      </Button>
                      <Button size="lg" variant="ghost" className={cn("hidden sm:inline-flex", b.theme === "light" ? "" : "text-white hover:bg-white/10")} asChild>
                        <Link href="/products">{t.common.actions.viewAll}</Link>
                      </Button>
                    </div>
                  </div>
                  <div className="relative flex items-center justify-center">
                    <div className={cn("aspect-square w-[92%] max-w-[440px] transition-all duration-1000 sm:w-[78%]", index === i ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0")}>
                      <BannerVisual banner={b} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-3.5 left-5 z-10 flex items-center gap-2 sm:bottom-5 sm:left-12 lg:left-16">
        {banners.map((b, i) => (
          <button
            key={b.id}
            onClick={() => embla?.scrollTo(i)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              index === i ? "w-8 bg-primary" : "w-3 bg-current opacity-30",
              banners[index]?.theme !== "light" && "text-white",
            )}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
      <div className="absolute right-6 bottom-5 z-10 hidden gap-2 md:flex">
        <button
          onClick={() => embla?.scrollPrev()}
          className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur transition hover:bg-black/40"
          aria-label={t.common.actions.previous}
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          onClick={() => embla?.scrollNext()}
          className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur transition hover:bg-black/40"
          aria-label={t.common.actions.next}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}
