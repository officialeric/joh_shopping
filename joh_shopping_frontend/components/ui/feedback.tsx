"use client";

import type * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, fmt } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { Button } from "./button";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-16 text-center", className)}>
      <div className="relative mb-5">
        <div className="absolute inset-0 scale-150 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex size-16 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-soft [&_svg]:size-7">
          {icon}
        </div>
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Pagination({
  page,
  lastPage,
  onPageChange,
  className,
}: {
  page: number;
  lastPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const { t } = useT();
  if (lastPage <= 1) return null;
  const pages = pageWindow(page, lastPage);
  return (
    <nav className={cn("flex items-center justify-center gap-1.5", className)} aria-label="Pagination">
      <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label={t.common.actions.previous}>
        <ChevronLeft />
      </Button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-1 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "ghost"}
            size="icon-sm"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
            className="tabular-nums"
          >
            {p}
          </Button>
        ),
      )}
      <Button variant="outline" size="icon-sm" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)} aria-label={t.common.actions.next}>
        <ChevronRight />
      </Button>
      <span className="sr-only">{fmt(t.common.misc.page, { page, total: lastPage })}</span>
    </nav>
  );
}

function pageWindow(page: number, last: number): (number | "…")[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(last - 1, page + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < last - 1) out.push("…");
  out.push(last);
  return out;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-primary uppercase">{eyebrow}</p>}
        <h2 className="text-2xl font-semibold text-balance sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
