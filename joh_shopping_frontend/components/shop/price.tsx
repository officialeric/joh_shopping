import { cn, discountPercent, formatTZS } from "@/lib/utils";

export function Price({
  price,
  compareAt,
  size = "md",
  className,
  showBadge,
}: {
  price: number;
  compareAt?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showBadge?: boolean;
}) {
  const off = discountPercent(price, compareAt);
  const main = { sm: "text-sm", md: "text-base", lg: "text-xl", xl: "text-3xl" }[size];
  const old = { sm: "text-xs", md: "text-xs", lg: "text-sm", xl: "text-base" }[size];
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span className={cn("font-display font-semibold tracking-tight tabular-nums", main, off > 0 && "text-primary")}>
        {formatTZS(price)}
      </span>
      {off > 0 && (
        <>
          <span className={cn("text-muted-foreground line-through tabular-nums", old)}>{formatTZS(compareAt!)}</span>
          {showBadge && (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary-soft-foreground">
              -{off}%
            </span>
          )}
        </>
      )}
    </div>
  );
}
