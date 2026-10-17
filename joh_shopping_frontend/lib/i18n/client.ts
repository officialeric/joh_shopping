"use client";

import { useRouter } from "next/navigation";
import { createContext, createElement, useCallback, useContext, useMemo } from "react";
import { dictionaries } from "@/dictionaries";
import { defaultLocale, localizePath, type Locale } from "./config";

/*
 * The locale comes from the root layout (server root param) via context.
 * Reading it with useParams() would make every client component depend on
 * the full URL params and block prerendering on dynamic routes.
 */
const LocaleContext = createContext<Locale>(defaultLocale);

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return createElement(LocaleContext.Provider, { value: locale }, children);
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Client-side translations; the locale comes from the URL. */
export function useT() {
  const locale = useLocale();
  return useMemo(() => ({ locale, t: dictionaries[locale] }), [locale]);
}

/** Returns a function that prefixes app paths with the active locale. */
export function useLocalizePath() {
  const locale = useLocale();
  return useCallback((path: string) => localizePath(path, locale), [locale]);
}

export function useLocalizedRouter() {
  const router = useRouter();
  const localize = useLocalizePath();
  return useMemo(
    () => ({
      push: (path: string) => router.push(localize(path)),
      replace: (path: string) => router.replace(localize(path)),
      back: () => router.back(),
      refresh: () => router.refresh(),
    }),
    [router, localize],
  );
}
