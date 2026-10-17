import { lang } from "next/root-params";
import { dictionaries } from "@/dictionaries";
import { defaultLocale, hasLocale, type Locale } from "./config";

export async function getLocale(): Promise<Locale> {
  const value = await lang();
  return value && hasLocale(value) ? value : defaultLocale;
}

/** Server-side translations for the current route's locale. */
export async function getT() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
