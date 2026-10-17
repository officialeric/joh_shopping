import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, hasLocale, LOCALE_COOKIE } from "@/lib/i18n/config";

/**
 * Every page lives under /{locale}. Requests without a locale prefix are
 * redirected to the visitor's saved language, falling back to Swahili.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";

  if (hasLocale(first)) {
    const response = NextResponse.next();
    if (request.cookies.get(LOCALE_COOKIE)?.value !== first) {
      response.cookies.set(LOCALE_COOKIE, first, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    return response;
  }

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = saved && hasLocale(saved) ? saved : defaultLocale;
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap.xml|.*\\..*).*)"],
};
