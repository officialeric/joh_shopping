import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-200 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-glow",
        secondary: "bg-secondary text-secondary-foreground hover:opacity-90",
        outline: "border border-border bg-card hover:border-foreground/20 hover:bg-accent",
        ghost: "hover:bg-accent",
        soft: "bg-primary-soft text-primary-soft-foreground hover:bg-brand-100 dark:hover:bg-brand-950",
        destructive: "bg-destructive text-white hover:opacity-90",
        link: "rounded-none px-0 text-primary underline-offset-4 hover:underline",
        white: "bg-white text-neutral-950 hover:bg-neutral-100",
      },
      size: {
        sm: "h-8 px-3.5 text-xs",
        default: "h-10 px-5 text-sm",
        lg: "h-12 px-7 text-[15px]",
        xl: "h-14 px-8 text-base",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({ className, variant, size, asChild, loading, disabled, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="animate-spin" />}
          {children}
        </>
      )}
    </Comp>
  );
}
