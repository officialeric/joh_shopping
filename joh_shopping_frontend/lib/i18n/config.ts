export const locales = ["sw", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "sw";
export const LOCALE_COOKIE = "JOH_LOCALE";

export const localeNames: Record<Locale, string> = {
  sw: "Kiswahili",
  en: "English",
};

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Prefixes an app path with the locale: ("/products", "en") -> "/en/products". */
export function localizePath(path: string, locale: Locale) {
  if (/^https?:\/\//.test(path)) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean === "/" ? "" : clean}`;
}

/** Swaps the locale segment of an existing pathname. */
export function switchLocalePath(pathname: string, next: Locale) {
  const parts = pathname.split("/");
  if (parts[1] && hasLocale(parts[1])) parts[1] = next;
  else parts.splice(1, 0, next);
  return parts.join("/") || `/${next}`;
}
