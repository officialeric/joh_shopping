import type * as React from "react";
import { cn } from "@/lib/utils";

/** Shared header band for content pages (about, contact, FAQ, policies…). */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
  className,
  dark,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <section className={cn("relative overflow-hidden border-b border-border", dark ? "bg-neutral-950 text-white" : "bg-card", className)}>
      <div
        className={cn(
          "absolute inset-0",
          dark
            ? "bg-[radial-gradient(50%_80%_at_85%_0%,rgba(238,47,66,0.45),transparent_70%)]"
            : "bg-[radial-gradient(40%_70%_at_90%_0%,rgba(238,47,66,0.10),transparent_70%)]",
        )}
      />
      <div className="container-page relative py-14 sm:py-20">
        {eyebrow && <p className={cn("mb-3 text-xs font-semibold tracking-[0.2em] uppercase", dark ? "text-brand-300" : "text-primary")}>{eyebrow}</p>}
        <h1 className="max-w-3xl text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl">{title}</h1>
        {subtitle && <p className={cn("mt-4 max-w-2xl text-lg", dark ? "text-white/70" : "text-muted-foreground")}>{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}

/** Renders the lightweight policy markup ("## " headings, "- " bullets). */
export function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-5 text-[15px] leading-relaxed text-muted-foreground">
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          const [heading, ...rest] = block.split("\n");
          return (
            <div key={i} className="space-y-3 pt-4">
              <h2 className="text-xl font-semibold text-foreground">{heading!.slice(3)}</h2>
              {rest.length > 0 && <Lines lines={rest} />}
            </div>
          );
        }
        return <Lines key={i} lines={block.split("\n")} />;
      })}
    </div>
  );
}

function Lines({ lines }: { lines: string[] }) {
  if (lines.every((l) => l.startsWith("- "))) {
    return (
      <ul className="space-y-2">
        {lines.map((l) => (
          <li key={l} className="flex gap-3">
            <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
            {l.slice(2)}
          </li>
        ))}
      </ul>
    );
  }
  return <p>{lines.join(" ")}</p>;
}
