import Image from "next/image";
import { cn } from "@/lib/utils";
import mark from "@/public/brand/logo-mark.png";

/**
 * Official Joh Shopping logo: the red emblem plus the "Joh Shopping" wordmark.
 * The wordmark is an alpha mask filled with the current text colour, so it
 * follows light/dark mode (and `inverted` on dark surfaces).
 * Source artwork: public/brand/logo_full.jpeg and logo_mini.jpeg.
 */
export function Logo({ className, inverted, compact }: { className?: string; inverted?: boolean; compact?: boolean }) {
  return (
    <span role="img" aria-label="Joh Shopping" className={cn("inline-flex items-center gap-2 select-none", className)}>
      <Image src={mark} alt="" priority className="h-9 w-auto shrink-0" />
      {!compact && (
        <span
          aria-hidden
          className={cn("block h-6 aspect-[1174/380] bg-current", inverted ? "text-white" : "text-foreground")}
          style={{
            maskImage: "url(/brand/logo-wordmark.png)",
            WebkitMaskImage: "url(/brand/logo-wordmark.png)",
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
          }}
        />
      )}
    </span>
  );
}
