"use client";

import * as React from "react";
import {
  Accordion as AccordionPrimitive,
  Avatar as AvatarPrimitive,
  Progress as ProgressPrimitive,
  Separator as SeparatorPrimitive,
  Slider as SliderPrimitive,
  Tabs as TabsPrimitive,
} from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown, Star } from "lucide-react";
import { cn, initials } from "@/lib/utils";

// ---------------------------------------------------------------- Badge

export const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        soft: "border-transparent bg-primary-soft text-primary-soft-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border bg-card text-foreground",
        muted: "border-transparent bg-muted text-muted-foreground",
        success: "border-transparent bg-success-soft text-success",
        warning: "border-transparent bg-warning-soft text-warning",
        info: "border-transparent bg-info-soft text-info",
        danger: "border-transparent bg-primary-soft text-primary",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// ---------------------------------------------------------------- Card

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-border bg-card text-card-foreground shadow-soft", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap items-start justify-between gap-3 p-5 pb-0 sm:p-6 sm:pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("font-display text-base font-semibold", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}

// ---------------------------------------------------------------- Separator

export function Separator({ className, orientation = "horizontal", ...props }: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      orientation={orientation}
      className={cn("shrink-0 bg-border", orientation === "horizontal" ? "h-px w-full" : "h-full w-px", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------- Skeleton

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("skeleton rounded-xl", className)} {...props} />;
}

// ---------------------------------------------------------------- Tabs

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, variant = "pill", ...props }: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: "pill" | "line" }) {
  return (
    <TabsPrimitive.List
      className={cn(
        "scrollbar-none inline-flex max-w-full items-center overflow-x-auto",
        variant === "pill" ? "gap-1 rounded-full bg-muted p-1" : "w-full gap-6 border-b border-border",
        className,
      )}
      data-variant={variant}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all outline-none hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
        "[[data-variant=pill]_&]:h-9 [[data-variant=pill]_&]:rounded-full [[data-variant=pill]_&]:px-4 [[data-variant=pill]_&]:data-[state=active]:bg-card [[data-variant=pill]_&]:data-[state=active]:text-foreground [[data-variant=pill]_&]:data-[state=active]:shadow-soft",
        "[[data-variant=line]_&]:-mb-px [[data-variant=line]_&]:border-b-2 [[data-variant=line]_&]:border-transparent [[data-variant=line]_&]:py-3 [[data-variant=line]_&]:data-[state=active]:border-primary [[data-variant=line]_&]:data-[state=active]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("outline-none data-[state=active]:animate-[fade-in_0.25s_ease-out]", className)} {...props} />;
}

// ---------------------------------------------------------------- Accordion

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn("border-b border-border last:border-b-0", className)} {...props} />;
}

export function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "flex flex-1 items-center justify-between gap-4 py-4 text-left text-[15px] font-medium transition-colors outline-none hover:text-primary [&[data-state=open]>svg]:rotate-180",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content className="overflow-hidden text-sm text-muted-foreground" {...props}>
      <div className={cn("pb-4 leading-relaxed", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}

// ---------------------------------------------------------------- Avatar

export function Avatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  return (
    <AvatarPrimitive.Root className={cn("relative flex size-9 shrink-0 overflow-hidden rounded-full", className)}>
      {src && <AvatarPrimitive.Image src={src} alt={name} className="aspect-square size-full object-cover" />}
      <AvatarPrimitive.Fallback className="flex size-full items-center justify-center bg-gradient-to-br from-brand-500 to-brand-800 text-xs font-semibold text-white">
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

// ---------------------------------------------------------------- Progress / Slider

export function Progress({ value, className, indicatorClassName }: { value: number; className?: string; indicatorClassName?: string }) {
  return (
    <ProgressPrimitive.Root value={value} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <ProgressPrimitive.Indicator
        className={cn("h-full rounded-full bg-primary transition-all duration-500", indicatorClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </ProgressPrimitive.Root>
  );
}

export function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const count = (props.value ?? props.defaultValue ?? [0]).length;
  return (
    <SliderPrimitive.Root className={cn("relative flex w-full touch-none items-center select-none", className)} {...props}>
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {Array.from({ length: count }).map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className="block size-5 rounded-full border-2 border-primary bg-white shadow-md transition outline-none hover:scale-110 focus-visible:ring-4 focus-visible:ring-primary/20"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

// ---------------------------------------------------------------- Rating

export function Rating({ value, size = "sm", className }: { value: number; size?: "xs" | "sm" | "md" | "lg"; className?: string }) {
  const px = { xs: "size-3", sm: "size-3.5", md: "size-4", lg: "size-5" }[size];
  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`${value} / 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className={cn("relative", px)}>
            <Star className={cn("absolute inset-0 text-border", px)} fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn("text-amber-400", px)} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = React.useState(0);
  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="transition hover:scale-110"
          aria-label={`${n} stars`}
        >
          <Star className={cn("size-7", (hover || value) >= n ? "text-amber-400" : "text-border")} fill="currentColor" strokeWidth={0} />
        </button>
      ))}
    </div>
  );
}
