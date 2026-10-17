"use client";

import { useQuery } from "@tanstack/react-query";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useMounted } from "@/lib/hooks";
import { toast } from "sonner";
import type { PaymentMethod } from "@/types";
import { MOBILE_MONEY } from "@/components/brand/payment-logos";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect, Switch } from "@/components/ui/form-controls";
import { Skeleton } from "@/components/ui/primitives";
import { AccountHeader, SettingsSection, useAccountUser } from "@/components/account/account-shell";
import { useSwitchLocale } from "@/components/layout/switchers";
import { getPreferences, savePreferences, subscribe } from "@/lib/api/shop";
import type { CustomerPreferences } from "@/types";
import { localeNames, locales, type Locale } from "@/lib/i18n/config";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api/errors";

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

export default function SettingsPage() {
  const { locale } = useT();
  const user = useAccountUser();
  const { data } = useQuery({ queryKey: ["prefs", user.id], queryFn: () => getPreferences() });
  if (!data) return <Skeleton className="h-[600px]" />;
  return <SettingsForm initial={{ ...data, language: locale }} />;
}

function SettingsForm({ initial }: { initial: CustomerPreferences }) {
  const { t, locale } = useT();
  const s = t.account.settings;
  const user = useAccountUser();
  const switchLocale = useSwitchLocale();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<CustomerPreferences>) => setPrefs({ ...prefs, ...patch });
  const toggle = (k: keyof CustomerPreferences) => ({ checked: prefs[k] as boolean, onChange: (v: boolean) => set({ [k]: v }) });

  const save = async () => {
    setSaving(true);
    try {
      await savePreferences(prefs);
      if (prefs.newsletter) await subscribe(user.email, "popup").catch(() => {});
      toast.success(s.saved);
      if (prefs.language !== locale) switchLocale(prefs.language);
    } catch (err) {
      toast.error(apiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AccountHeader title={s.title} subtitle={s.subtitle} action={<Button onClick={save} loading={saving}>{t.common.actions.saveChanges}</Button>} />
      <div className="space-y-6">
        <SettingsSection title={s.language} description={s.languageDesc}>
          <div className="grid gap-3 sm:grid-cols-2">
            {locales.map((l) => (
              <button
                key={l}
                onClick={() => set({ language: l as Locale })}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-4 text-left transition",
                  prefs.language === l ? "border-primary bg-primary-soft/50 ring-1 ring-primary" : "border-border hover:border-foreground/30",
                )}
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-muted font-display text-sm font-semibold">{l.toUpperCase()}</span>
                <span className="font-medium">{localeNames[l]}</span>
              </button>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection title={s.appearance} description={s.appearanceDesc}>
          <div className="grid grid-cols-3 gap-3">
            {[
              { v: "light", label: t.common.theme.light, icon: Sun },
              { v: "dark", label: t.common.theme.dark, icon: Moon },
              { v: "system", label: t.common.theme.system, icon: Monitor },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setTheme(o.v)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-medium transition",
                  mounted && theme === o.v ? "border-primary bg-primary-soft/50 ring-1 ring-primary" : "border-border hover:border-foreground/30",
                )}
              >
                <o.icon className="size-5" />
                {o.label}
              </button>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection title={s.channels} description={s.channelsDesc}>
          <div className="divide-y divide-border">
            <ToggleRow label={s.email} {...toggle("notifyEmail")} />
            <ToggleRow label={s.sms} {...toggle("notifySms")} />
            <ToggleRow label={s.whatsapp} {...toggle("notifyWhatsapp")} />
          </div>
        </SettingsSection>

        <SettingsSection title={s.topics}>
          <div className="divide-y divide-border">
            <ToggleRow label={s.orderUpdates} desc={s.orderUpdatesDesc} {...toggle("orderUpdates")} />
            <ToggleRow label={s.promotions} desc={s.promotionsDesc} {...toggle("promotions")} />
            <ToggleRow label={s.priceDrops} desc={s.priceDropsDesc} {...toggle("priceDrops")} />
            <ToggleRow label={s.newsletter} desc={s.newsletterDesc} {...toggle("newsletter")} />
          </div>
        </SettingsSection>

        <SettingsSection title={s.shopping} description={s.shoppingDesc}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={s.preferredPayment} htmlFor="pref-pay">
              <NativeSelect id="pref-pay" value={prefs.preferredPayment} onChange={(e) => set({ preferredPayment: e.target.value as PaymentMethod })}>
                {[...MOBILE_MONEY, "card" as const].map((m) => (
                  <option key={m} value={m}>
                    {m === "card" ? t.common.payment.card : t.common.payment[m as "mpesa"]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label={s.preferredDelivery} htmlFor="pref-del">
              <NativeSelect id="pref-del" value={prefs.preferredDelivery} onChange={(e) => set({ preferredDelivery: e.target.value as CustomerPreferences["preferredDelivery"] })}>
                {(["standard", "express", "pickup"] as const).map((d) => (
                  <option key={d} value={d}>
                    {t.common.delivery[d]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
        </SettingsSection>

        <div className="flex justify-end">
          <Button size="lg" onClick={save} loading={saving}>
            {t.common.actions.saveChanges}
          </Button>
        </div>
      </div>
    </>
  );
}
