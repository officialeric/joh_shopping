"use client";

import * as React from "react";
import {
  AlertDialog as AlertPrimitive,
  Dialog as DialogPrimitive,
  DropdownMenu as MenuPrimitive,
  Popover as PopoverPrimitive,
  Tooltip as TooltipPrimitive,
} from "radix-ui";
import { Check, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

// ---------------------------------------------------------------- Dialog

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const overlayCls =
  "fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_0.2s_ease-out]";

export function DialogContent({
  className,
  children,
  hideClose,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { hideClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayCls} />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-2xl border border-border bg-popover p-6 text-popover-foreground shadow-lift outline-none",
          "data-[state=open]:animate-[fade-up_0.25s_ease-out]",
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close className="absolute top-4 right-4 rounded-full p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-1.5 pr-8", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("font-display text-lg font-semibold", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

// ---------------------------------------------------------------- Sheet (side drawer)

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const sheetSides = {
  right: "inset-y-0 right-0 h-full w-full max-w-md border-l data-[state=open]:animate-[sheet-in-right_0.3s_cubic-bezier(0.16,1,0.3,1)]",
  left: "inset-y-0 left-0 h-full w-[85%] max-w-sm border-r data-[state=open]:animate-[sheet-in-left_0.3s_cubic-bezier(0.16,1,0.3,1)]",
  bottom: "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl border-t data-[state=open]:animate-[sheet-in-bottom_0.3s_cubic-bezier(0.16,1,0.3,1)]",
};

export function SheetContent({
  side = "right",
  className,
  children,
  heading,
  description,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Content>, "title"> & {
  side?: keyof typeof sheetSides;
  heading: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayCls} />
      <DialogPrimitive.Content
        className={cn("fixed z-50 flex flex-col border-border bg-background shadow-lift outline-none", sheetSides[side], className)}
        {...props}
      >
        {side === "bottom" && <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-border" />}
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <DialogPrimitive.Title className="font-display text-lg font-semibold">{heading}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-sm text-muted-foreground">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{heading}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close className="rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground">
            <X className="size-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

// ---------------------------------------------------------------- Confirm dialog

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = true,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className={overlayCls} />
        <AlertPrimitive.Content className="fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border border-border bg-popover p-6 shadow-lift data-[state=open]:animate-[fade-up_0.25s_ease-out]">
          <AlertPrimitive.Title className="font-display text-lg font-semibold">{title}</AlertPrimitive.Title>
          <AlertPrimitive.Description className="text-sm text-muted-foreground">{description}</AlertPrimitive.Description>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertPrimitive.Cancel className={buttonVariants({ variant: "outline" })}>{cancelLabel}</AlertPrimitive.Cancel>
            <AlertPrimitive.Action
              className={buttonVariants({ variant: destructive ? "destructive" : "default" })}
              onClick={onConfirm}
            >
              {confirmLabel}
            </AlertPrimitive.Action>
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  );
}

// ---------------------------------------------------------------- Dropdown menu

export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;
export const DropdownMenuGroup = MenuPrimitive.Group;
export const DropdownMenuSub = MenuPrimitive.Sub;
export const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup;

const menuSurface =
  "z-50 min-w-48 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lift data-[state=open]:animate-[fade-up_0.18s_ease-out]";

export function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content sideOffset={sideOffset} className={cn(menuSurface, className)} {...props} />
    </MenuPrimitive.Portal>
  );
}

const itemCls =
  "relative flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none select-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent [&_svg]:size-4 [&_svg]:text-muted-foreground";

export function DropdownMenuItem({
  className,
  destructive,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Item> & { destructive?: boolean }) {
  return (
    <MenuPrimitive.Item
      className={cn(itemCls, destructive && "text-destructive data-[highlighted]:bg-destructive/10 [&_svg]:text-destructive", className)}
      {...props}
    />
  );
}

export function DropdownMenuRadioItem({ className, children, ...props }: React.ComponentProps<typeof MenuPrimitive.RadioItem>) {
  return (
    <MenuPrimitive.RadioItem className={cn(itemCls, "pr-8", className)} {...props}>
      {children}
      <MenuPrimitive.ItemIndicator className="absolute right-2.5">
        <Check className="size-4 !text-primary" />
      </MenuPrimitive.ItemIndicator>
    </MenuPrimitive.RadioItem>
  );
}

export function DropdownMenuSubTrigger({ className, children, ...props }: React.ComponentProps<typeof MenuPrimitive.SubTrigger>) {
  return (
    <MenuPrimitive.SubTrigger className={cn(itemCls, "data-[state=open]:bg-accent", className)} {...props}>
      {children}
      <ChevronRight className="ml-auto" />
    </MenuPrimitive.SubTrigger>
  );
}

export function DropdownMenuSubContent({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.SubContent>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.SubContent className={cn(menuSurface, className)} {...props} />
    </MenuPrimitive.Portal>
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Label>) {
  return <MenuPrimitive.Label className={cn("px-2.5 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Separator>) {
  return <MenuPrimitive.Separator className={cn("-mx-1.5 my-1.5 h-px bg-border", className)} {...props} />;
}

// ---------------------------------------------------------------- Popover

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export function PopoverContent({
  className,
  align = "center",
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(menuSurface, "w-72 p-4", className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

// ---------------------------------------------------------------- Tooltip

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-50 rounded-lg bg-neutral-950 px-2.5 py-1.5 text-xs font-medium text-white shadow-lift data-[state=delayed-open]:animate-[fade-up_0.15s_ease-out] dark:bg-white dark:text-neutral-950"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
