"use client";

import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput } from "@/components/ui/form-controls";
import { Link } from "@/components/ui/link";
import { adminLogin } from "@/lib/api/admin";
import { useLocalizedRouter, useT } from "@/lib/i18n/client";
import { apiErrorMessage } from "@/lib/api/errors";
import { useAdminAuth } from "@/stores";

/** Demo logins from the seeded database; hide on a live store with NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=false. */
const SHOW_DEMO = process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS !== "false";
const DEMO = [{ role: "Super Admin", email: "support@johshopping.com", password: "Admin@123" }];

export default function AdminLoginPage() {
  const { t } = useT();
  const l = t.admin.login;
  const router = useLocalizedRouter();
  const setAdmin = useAdminAuth((s) => s.setAdmin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      setAdmin(await adminLogin(email, password));
      router.replace("/admin");
    } catch (err) {
      setError(apiErrorMessage(err, t));
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-neutral-950 px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(238,47,66,0.35),transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center text-white">
          <Logo inverted />
          <span className="mt-3 rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-white/60 uppercase">{t.admin.panel}</span>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-card p-8 shadow-lift">
          <h1 className="text-2xl font-semibold">{l.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{l.subtitle}</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {error && <p className="rounded-xl bg-primary-soft px-4 py-3 text-sm font-medium text-primary-soft-foreground">{error}</p>}
            <Field label={l.email} htmlFor="a-email">
              <Input id="a-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field
              label={
                <span className="flex w-full items-center justify-between">
                  {l.password}
                  <Link href="/admin/forgot-password" className="text-xs font-medium text-primary hover:underline">
                    {l.forgot}
                  </Link>
                </span>
              }
              htmlFor="a-password"
            >
              <PasswordInput id="a-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={loading}>
              {l.submit}
            </Button>
          </form>
          {SHOW_DEMO && (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">{l.demo}</p>
            <div className="grid gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => {
                    setEmail(d.email);
                    setPassword(d.password);
                  }}
                  className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-left text-xs transition hover:bg-accent"
                >
                  <span className="font-semibold">{d.role}</span>
                  <span className="text-muted-foreground">
                    {d.email} · {d.password}
                  </span>
                </button>
              ))}
            </div>
          </div>
          )}
        </div>
        <div className="mt-6 flex items-center justify-between text-xs text-white/50">
          <Link href="/" className="flex items-center gap-1.5 hover:text-white">
            <ArrowLeft className="size-3.5" />
            {l.backToStore}
          </Link>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" />
            {l.secure}
          </span>
        </div>
      </div>
    </div>
  );
}
