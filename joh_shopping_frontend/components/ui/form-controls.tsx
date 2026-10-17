"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive, Label as LabelPrimitive, RadioGroup as RadioPrimitive, Switch as SwitchPrimitive } from "radix-ui";
import { Check, ChevronDown, Eye, EyeOff, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full min-w-0 rounded-xl border border-input bg-card px-3.5 text-sm text-foreground shadow-xs transition-colors outline-none placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-destructive/10";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(fieldBase, "h-11", className)} {...props} />;
}

export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} className={cn("pr-11", className)} {...props} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={show ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(fieldBase, "min-h-28 py-3 leading-relaxed", className)} {...props} />;
}

export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(fieldBase, "h-11 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn("text-sm font-medium leading-none text-foreground select-none peer-disabled:opacity-60", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  optional,
  className,
  children,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: React.ReactNode;
  optional?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      {label && (
        <Label htmlFor={htmlFor} className="flex items-center justify-between gap-2">
          <span className="flex flex-1 items-center">{label}</span>
          {optional && <span className="text-xs font-normal text-muted-foreground">{optional}</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer size-[18px] shrink-0 rounded-[5px] border border-input bg-card shadow-xs transition-colors outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-white",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        {props.checked === "indeterminate" ? <Minus className="size-3.5" strokeWidth={3} /> : <Check className="size-3.5" strokeWidth={3} />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent bg-input transition-colors outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 rounded-full bg-white shadow-md ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitive.Root>
  );
}

export const RadioGroup = ({ className, ...props }: React.ComponentProps<typeof RadioPrimitive.Root>) => (
  <RadioPrimitive.Root className={cn("grid gap-3", className)} {...props} />
);

export function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioPrimitive.Item>) {
  return (
    <RadioPrimitive.Item
      className={cn(
        "aspect-square size-[18px] shrink-0 rounded-full border border-input bg-card shadow-xs outline-none focus-visible:ring-4 focus-visible:ring-primary/15 data-[state=checked]:border-primary",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="flex items-center justify-center">
        <span className="size-2.5 rounded-full bg-primary" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Item>
  );
}

/** Selectable card used for payment / delivery choices. */
export function RadioCard({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <RadioPrimitive.Item
      value={value}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-all outline-none hover:border-foreground/25 focus-visible:ring-4 focus-visible:ring-primary/15 data-[state=checked]:border-primary data-[state=checked]:bg-primary-soft/50 data-[state=checked]:ring-1 data-[state=checked]:ring-primary",
        className,
      )}
    >
      <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border border-input bg-card group-data-[state=checked]:border-primary">
        <span className="size-2.5 scale-0 rounded-full bg-primary transition-transform group-data-[state=checked]:scale-100" />
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </RadioPrimitive.Item>
  );
}

export function QuantityInput({
  value,
  onChange,
  min = 1,
  max = 99,
  size = "default",
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "default";
}) {
  const btn = size === "sm" ? "size-8" : "size-11";
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-card">
      <button
        type="button"
        className={cn(btn, "flex items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40")}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <Minus className="size-3.5" />
      </button>
      <span className={cn("min-w-8 text-center text-sm font-semibold tabular-nums", size === "sm" && "min-w-6")}>{value}</span>
      <button
        type="button"
        className={cn(btn, "flex items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40")}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
