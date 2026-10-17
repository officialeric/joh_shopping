import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { Providers } from "@/components/providers";
import { locales } from "@/lib/i18n/config";
import { LocaleProvider } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";
import { getShopData } from "@/lib/data/server";
import { ShopProvider } from "@/lib/data/shop-context";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getT();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: `${t.common.brand.name} — ${t.common.brand.tagline}`, template: `%s | ${t.common.brand.name}` },
    description: t.common.footer.about,
    alternates: { languages: { sw: "/sw", en: "/en" } },
    openGraph: { siteName: t.common.brand.name, locale: locale === "sw" ? "sw_TZ" : "en_TZ", type: "website" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const [{ locale }, shopData] = await Promise.all([getT(), getShopData()]);
  return (
    <html lang={locale} suppressHydrationWarning className={`${inter.variable} ${sora.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <LocaleProvider locale={locale}>
          <ShopProvider data={shopData}>
            <Providers>{children}</Providers>
          </ShopProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
