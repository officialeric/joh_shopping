import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Locale } from "@/lib/i18n/config";
import type { Localized } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a TZS amount, e.g. 4200000 -> "TSh 4,200,000" (non-breaking space). */
export function formatTZS(amount: number, opts: { compact?: boolean } = {}) {
  if (opts.compact) {
    if (amount >= 1_000_000_000) return `TSh\u00a0${trim(amount / 1_000_000_000)}B`;
    if (amount >= 1_000_000) return `TSh\u00a0${trim(amount / 1_000_000)}M`;
    if (amount >= 1_000) return `TSh\u00a0${trim(amount / 1_000)}K`;
  }
  return `TSh\u00a0${Math.round(amount).toLocaleString("en-US")}`;
}

function trim(n: number) {
  return n.toFixed(1).replace(/\.0$/, "");
}

export function formatNumber(n: number) {
  return n.toLocaleString("en-US");
}

const dateLocales: Record<Locale, string> = { sw: "sw-TZ", en: "en-GB" };
const eastAfricaTimeZone = "Africa/Nairobi";

export function formatDate(
  value: string | Date,
  locale: Locale,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
) {
  return new Intl.DateTimeFormat(dateLocales[locale], { ...opts, timeZone: eastAfricaTimeZone }).format(new Date(value));
}

export function formatDateTime(value: string | Date, locale: Locale) {
  return formatDate(value, locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Picks the right language from a bilingual field. */
export function l(value: Localized | string | undefined, locale: Locale): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[locale] ?? value.sw;
}

/** Replaces {name} placeholders in a translated string. */
export function fmt(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

export function discountPercent(price: number, compareAt?: number) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Normalises Tanzanian phone numbers to +255XXXXXXXXX. */
export function normalizeTzPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("255")) return `+${digits}`;
  if (digits.startsWith("0")) return `+255${digits.slice(1)}`;
  return `+255${digits}`;
}

export const TZ_PHONE_REGEX = /^(?:\+?255|0)[67]\d{8}$/;

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
