"use client";

import { ArrowLeft, KeyRound, MailCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput } from "@/components/ui/form-controls";
import { Link } from "@/components/ui/link";
import { PasswordStrength, passwordScore } from "@/components/auth/auth-forms";
import { adminForgotPassword, adminResetPassword } from "@/lib/api/admin";
import { apiErrorMessage } from "@/lib/api/errors";
import { useLocalizedRouter, useT } from "@/lib/i18n/client";

/** Dark card layout shared by the staff sign-in helper pages. */
function AdminAuthCard({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  const { t } = useT();
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-neutral-950 px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(238,47,66,0.35),transparent_70%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center text-white">
          <Logo inverted />
          <span className="mt-3 rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-white/60 uppercase">{t.admin.panel}</span>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-card p-8 shadow-lift">
          <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary [&_svg]:size-6">{icon}</div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <Link href="/admin/login" className="mt-6 flex items-center justify-center gap-1.5 text-xs text-white/50 hover:text-white">
          <ArrowLeft className="size-3.5" />
          {t.admin.login.backToLogin}
        </Link>
      </div>
    </div>
  );
}

/** Set a password from an emailed link: staff invitation (`invite`) or password reset. */
export function StaffSetPassword({ invite }: { invite?: boolean }) {
  const { t } = useT();
  const l = t.admin.login;
  const v = t.common.validation;
  const router = useLocalizedRouter();
  const sp = useSearchParams();
  const token = sp.get("token");
  const email = sp.get("email") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (!token || !email) {
    return (
      <AdminAuthCard icon={<KeyRound />} title={invite ? l.inviteTitle : l.resetTitle} subtitle={l.invalidLink}>
        <Button size="lg" className="w-full" asChild>
          <Link href="/admin/forgot-password">{l.sendLink}</Link>
        </Button>
      </AdminAuthCard>
    );
  }

  return (
    <AdminAuthCard icon={<KeyRound />} title={invite ? l.inviteTitle : l.resetTitle} subtitle={invite ? l.inviteSubtitle : l.resetSubtitle}>
      <form
        className="space-y-4"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          const errs: Record<string, string> = {};
          if (passwordScore(password) < 3 || password.length < 8) errs.password = v.passwordWeak;
          if (password !== confirm) errs.confirm = v.passwordMismatch;
          setErrors(errs);
          if (Object.keys(errs).length) return;
          setLoading(true);
          try {
            await adminResetPassword({ token, email, password });
            toast.success(l.passwordSaved);
            router.replace("/admin/login");
          } catch (err) {
            toast.error(apiErrorMessage(err, t));
          } finally {
            setLoading(false);
          }
        }}
      >
        <Field label={l.email} htmlFor="sp-email">
          <Input id="sp-email" type="email" value={email} readOnly />
        </Field>
        <Field label={l.newPassword} htmlFor="sp-password" error={errors.password}>
          <PasswordInput id="sp-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <PasswordStrength value={password} />
        <Field label={l.confirmPassword} htmlFor="sp-confirm" error={errors.confirm}>
          <PasswordInput id="sp-confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {l.savePassword}
        </Button>
      </form>
    </AdminAuthCard>
  );
}

export function StaffForgotPassword() {
  const { t } = useT();
  const l = t.admin.login;
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  if (sent) {
    return (
      <AdminAuthCard icon={<MailCheck />} title={l.forgotTitle} subtitle={l.linkSent}>
        <span />
      </AdminAuthCard>
    );
  }

  return (
    <AdminAuthCard icon={<KeyRound />} title={l.forgotTitle} subtitle={l.forgotSubtitle}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          try {
            await adminForgotPassword(email);
            setSent(true);
          } catch (err) {
            toast.error(apiErrorMessage(err, t));
          } finally {
            setLoading(false);
          }
        }}
      >
        <Field label={l.email} htmlFor="fp-email">
          <Input id="fp-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {l.sendLink}
        </Button>
      </form>
    </AdminAuthCard>
  );
}
