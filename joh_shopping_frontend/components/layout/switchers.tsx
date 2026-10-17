"use client";

import { Check, Globe, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useMounted } from "@/lib/hooks";
import { localeNames, locales, LOCALE_COOKIE, switchLocalePath, type Locale } from "@/lib/i18n/config";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/overlays";

export function useSwitchLocale() {
  const router = useRouter();
  return (next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    router.push(`${switchLocalePath(window.location.pathname, next)}${window.location.search}`);
  };
}

export function LanguageSwitcher({ className, variant = "default" }: { className?: string; variant?: "default" | "topbar" }) {
  const { locale, t } = useT();
  const switchTo = useSwitchLocale();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full text-sm font-medium transition outline-none",
          variant === "topbar" ? "text-xs text-white/80 hover:text-white" : "h-9 px-3 hover:bg-accent",
          className,
        )}
        aria-label={t.common.language.label}
      >
        <Globe className="size-3.5" />
        {locale.toUpperCase()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel>{t.common.language.label}</DropdownMenuLabel>
        {locales.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => switchTo(l)}>
            <span className="w-6 text-xs font-semibold text-muted-foreground">{l.toUpperCase()}</span>
            {localeNames[l]}
            {l === locale && <Check className="ml-auto !text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useT();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useMounted();
  const options = [
    { value: "light", label: t.common.theme.light, icon: Sun },
    { value: "dark", label: t.common.theme.dark, icon: Moon },
    { value: "system", label: t.common.theme.system, icon: Monitor },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn("inline-flex size-10 items-center justify-center rounded-full transition outline-none hover:bg-accent", className)}
        aria-label={t.common.theme.label}
      >
        {mounted && resolvedTheme === "dark" ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel>{t.common.theme.label}</DropdownMenuLabel>
        {options.map((o) => (
          <DropdownMenuItem key={o.value} onSelect={() => setTheme(o.value)}>
            <o.icon />
            {o.label}
            {mounted && theme === o.value && <Check className="ml-auto !text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
