"use client";

import { useNow } from "@/lib/hooks";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/**
 * `cycleMs` keeps demo sales alive: once `endsAt` passes, the timer rolls
 * forward by whole cycles instead of sitting at zero.
 */
export function Countdown({
  endsAt,
  variant = "light",
  cycleMs,
  className,
}: {
  endsAt: string;
  variant?: "light" | "dark";
  cycleMs?: number;
  className?: string;
}) {
  const { t } = useT();
  const now = useNow();
  let end = new Date(endsAt).getTime();
  if (now != null && cycleMs && end < now) end += Math.ceil((now - end) / cycleMs) * cycleMs;
  const p = now == null ? null : parts(end - now);
  const units = [
    { v: p?.d, label: t.common.misc.days },
    { v: p?.h, label: t.common.misc.hours },
    { v: p?.m, label: t.common.misc.minutes },
    { v: p?.s, label: t.common.misc.seconds },
  ];
  return (
    <div className={cn("flex items-center gap-1.5", className)} role="timer" aria-live="off">
      {units.map((u, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div
            className={cn(
              "flex min-w-12 flex-col items-center rounded-xl px-2 py-1.5",
              variant === "dark" ? "bg-white/10 text-white backdrop-blur" : "bg-secondary text-secondary-foreground",
            )}
          >
            <span className="font-display text-lg leading-none font-semibold tabular-nums">{u.v == null ? "--" : String(u.v).padStart(2, "0")}</span>
            <span className="mt-0.5 text-[9px] tracking-wider uppercase opacity-70">{u.label}</span>
          </div>
          {i < 3 && <span className={cn("font-semibold", variant === "dark" ? "text-white/50" : "text-muted-foreground")}>:</span>}
        </div>
      ))}
    </div>
  );
}
