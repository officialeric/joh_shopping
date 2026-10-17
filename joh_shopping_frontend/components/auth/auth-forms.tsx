"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, KeyRound, MailCheck, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { GoogleIcon } from "@/components/brand/icons";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Label, PasswordInput } from "@/components/ui/form-controls";
import { Link } from "@/components/ui/link";
import { useQuery } from "@tanstack/react-query";
import { forgotPassword, login, register as registerApi, resendVerification, resetPassword, subscribe, twoFactorChallenge, verifyEmail } from "@/lib/api/shop";
import { apiErrorMessage, apiFieldErrors } from "@/lib/api/errors";
import type { User } from "@/types";
import { useLocalizedRouter, useT } from "@/lib/i18n/client";
import { cn, fmt, normalizeTzPhone, TZ_PHONE_REGEX } from "@/lib/utils";
import { useAuth } from "@/stores";

function AuthHeader({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle: React.ReactNode }) {
  return (
    <div className="mb-8">
      {icon && <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary [&_svg]:size-6">{icon}</div>}
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function SocialButtons() {
  const { t } = useT();
  return (
    <>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t.auth.login.or}
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button variant="outline" size="lg" className="w-full" type="button" onClick={() => toast.info(t.auth.login.socialSoon)}>
        <GoogleIcon className="size-5" />
        {t.auth.login.google}
      </Button>
    </>
  );
}

export function passwordScore(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export function PasswordStrength({ value }: { value: string }) {
  const { t } = useT();
  const score = passwordScore(value);
  const labels = [t.auth.register.strength.weak, t.auth.register.strength.weak, t.auth.register.strength.fair, t.auth.register.strength.good, t.auth.register.strength.strong];
  const colors = ["bg-destructive", "bg-destructive", "bg-warning", "bg-info", "bg-success"];
  if (!value) return null;
  return (
    <div className="flex items-center gap-3">
      <div className="grid flex-1 grid-cols-4 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1 rounded-full transition", i < score ? colors[score] : "bg-muted")} />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{labels[score]}</span>
    </div>
  );
}

// ---------------------------------------------------------------- Login

export function LoginForm() {
  const { t } = useT();
  const l = t.auth.login;
  const router = useLocalizedRouter();
  const next = useSearchParams().get("next");
  const setUser = useAuth((s) => s.setUser);
  const [error, setError] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const schema = z.object({
    identifier: z.string().trim().min(3, t.common.validation.required),
    password: z.string().min(1, t.common.validation.required),
    remember: z.boolean().optional(),
  });
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, formState, setValue } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { remember: true } });

  const onSubmit = async (v: Values) => {
    setError("");
    try {
      const result = await login(v.identifier, v.password, v.remember ?? true);
      if (result.twoFactor) setNeedsCode(true);
      else signedIn(result.user);
    } catch (err) {
      setError(apiErrorMessage(err, t));
    }
  };

  const signedIn = (user: User) => {
    setUser(user);
    toast.success(fmt(l.welcome, { name: user.name.split(" ")[0]! }));
    router.replace(next && next.startsWith("/") ? next : "/account");
  };

  if (needsCode) return <TwoFactorForm onSignedIn={signedIn} onBack={() => setNeedsCode(false)} />;

  return (
    <>
      <AuthHeader title={l.title} subtitle={l.subtitle} />
      {process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS !== "false" && (
      <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary-soft/50 p-3.5 text-xs">
        <div className="flex items-center gap-2.5">
          <Sparkles className="size-4 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">{l.demo}</p>
            <p className="text-muted-foreground">amina@example.co.tz · Password@123</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() => {
            setValue("identifier", "amina@example.co.tz");
            setValue("password", "Password@123");
          }}
        >
          {l.useDemo}
        </Button>
      </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && <p className="rounded-xl bg-primary-soft px-4 py-3 text-sm font-medium text-primary-soft-foreground">{error}</p>}
        <Field label={l.identifier} htmlFor="identifier" error={formState.errors.identifier?.message}>
          <Input id="identifier" autoComplete="username" placeholder={l.identifierPlaceholder} {...register("identifier")} />
        </Field>
        <Field
          label={
            <span className="flex w-full items-center justify-between">
              {l.password}
              <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                {l.forgot}
              </Link>
            </span>
          }
          htmlFor="password"
          error={formState.errors.password?.message}
        >
          <PasswordInput id="password" autoComplete="current-password" {...register("password")} />
        </Field>
        <div className="flex items-center gap-2.5">
          <Checkbox id="remember" defaultChecked onCheckedChange={(c) => setValue("remember", !!c)} />
          <Label htmlFor="remember" className="font-normal">
            {l.remember}
          </Label>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
          {l.submit}
        </Button>
      </form>
      <SocialButtons />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        {l.noAccount}{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          {l.createOne}
        </Link>
      </p>
    </>
  );
}

/** Second step for customers with two-step verification: the emailed 6-digit code. */
function TwoFactorForm({ onSignedIn, onBack }: { onSignedIn: (user: User) => void; onBack: () => void }) {
  const { t } = useT();
  const l = t.auth.login;
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <>
      <AuthHeader icon={<KeyRound />} title={l.twoFactorTitle} subtitle={l.twoFactorDesc} />
      <form
        className="space-y-4"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setLoading(true);
          try {
            onSignedIn(await twoFactorChallenge(code));
          } catch (err) {
            setError(apiErrorMessage(err, t));
          } finally {
            setLoading(false);
          }
        }}
      >
        <Field label={l.code} htmlFor="otp" error={error}>
          <Input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="text-center font-display text-2xl tracking-[0.5em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            autoFocus
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={code.length !== 6}>
          {l.verifyCode}
        </Button>
      </form>
      <button type="button" onClick={onBack} className="mt-8 flex w-full items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {l.backToLogin}
      </button>
    </>
  );
}

// ---------------------------------------------------------------- Register

export function RegisterForm() {
  const { t, locale } = useT();
  const r = t.auth.register;
  const v = t.common.validation;
  const router = useLocalizedRouter();
  const setUser = useAuth((s) => s.setUser);
  const schema = z
    .object({
      name: z.string().trim().min(3, fmt(v.min, { n: 3 })),
      email: z.string().email(v.email),
      phone: z.string().refine((s) => TZ_PHONE_REGEX.test(s.replace(/\s/g, "")), v.phone),
      password: z.string().refine((s) => passwordScore(s) >= 3 && s.length >= 8, v.passwordWeak),
      confirm: z.string(),
      terms: z.literal(true, { message: v.terms }),
      newsletter: z.boolean().optional(),
    })
    .refine((d) => d.password === d.confirm, { message: v.passwordMismatch, path: ["confirm"] });
  type Values = z.input<typeof schema>;
  const { register, handleSubmit, formState, setValue, watch, setError } = useForm<Values>({ resolver: zodResolver(schema) });
  const password = watch("password") ?? "";

  const onSubmit = async (d: Values) => {
    try {
      const user = await registerApi({ name: d.name, email: d.email, phone: normalizeTzPhone(d.phone), password: d.password, language: locale });
      if (d.newsletter) await subscribe(d.email, "popup").catch(() => {});
      setUser(user);
      toast.success(r.success);
      router.replace("/verify-email");
    } catch (err) {
      const fields = apiFieldErrors(err, t);
      for (const key of ["name", "email", "phone", "password"] as const) {
        if (fields[key]) setError(key, { message: fields[key] });
      }
      if (!Object.keys(fields).length) toast.error(apiErrorMessage(err, t));
    }
  };

  const e = formState.errors;
  return (
    <>
      <AuthHeader title={r.title} subtitle={r.subtitle} />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label={r.name} htmlFor="name" error={e.name?.message}>
          <Input id="name" autoComplete="name" placeholder={r.namePlaceholder} {...register("name")} aria-invalid={!!e.name} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={r.email} htmlFor="email" error={e.email?.message}>
            <Input id="email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!e.email} />
          </Field>
          <Field label={r.phone} htmlFor="phone" error={e.phone?.message}>
            <Input id="phone" type="tel" autoComplete="tel" placeholder="0712 345 678" {...register("phone")} aria-invalid={!!e.phone} />
          </Field>
        </div>
        <Field label={r.password} htmlFor="password" error={e.password?.message}>
          <PasswordInput id="password" autoComplete="new-password" {...register("password")} aria-invalid={!!e.password} />
        </Field>
        <PasswordStrength value={password} />
        <Field label={r.confirm} htmlFor="confirm" error={e.confirm?.message}>
          <PasswordInput id="confirm" autoComplete="new-password" {...register("confirm")} aria-invalid={!!e.confirm} />
        </Field>
        <div className="space-y-3 pt-1">
          <div className="flex items-start gap-2.5">
            <Checkbox id="terms" className="mt-0.5" onCheckedChange={(c) => setValue("terms", c === true ? true : (undefined as never), { shouldValidate: true })} />
            <Label htmlFor="terms" className="leading-relaxed font-normal">
              {r.terms.split(/(\{terms\}|\{privacy\})/).map((part, i) =>
                part === "{terms}" ? (
                  <Link key={i} href="/policies/terms" className="font-medium text-primary hover:underline">
                    {r.termsLink}
                  </Link>
                ) : part === "{privacy}" ? (
                  <Link key={i} href="/policies/privacy" className="font-medium text-primary hover:underline">
                    {r.privacyLink}
                  </Link>
                ) : (
                  part
                ),
              )}
            </Label>
          </div>
          {e.terms && <p className="text-xs font-medium text-destructive">{e.terms.message}</p>}
          <div className="flex items-center gap-2.5">
            <Checkbox id="newsletter" onCheckedChange={(c) => setValue("newsletter", !!c)} />
            <Label htmlFor="newsletter" className="font-normal">
              {r.newsletter}
            </Label>
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
          {r.submit}
        </Button>
      </form>
      <SocialButtons />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        {r.haveAccount}{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          {r.login}
        </Link>
      </p>
    </>
  );
}

// ---------------------------------------------------------------- Forgot / reset / verify

export function ForgotPasswordForm() {
  const { t } = useT();
  const f = t.auth.forgot;
  const [sentTo, setSentTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  if (sentTo) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
          <MailCheck className="size-8" />
        </div>
        <h1 className="text-3xl font-semibold">{f.sentTitle}</h1>
        <p className="mt-3 text-muted-foreground">{fmt(f.sentDesc, { email: sentTo })}</p>
        <div className="mt-8 grid gap-2">
          <Button
            size="lg"
            variant="outline"
            onClick={async () => {
              try {
                await forgotPassword(sentTo);
                toast.success(f.resent);
              } catch (err) {
                toast.error(apiErrorMessage(err, t));
              }
            }}
          >
            {f.resend}
          </Button>
        </div>
        <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          {f.back}
        </Link>
      </div>
    );
  }

  return (
    <>
      <AuthHeader icon={<KeyRound />} title={f.title} subtitle={f.subtitle} />
      <form
        className="space-y-4"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (!/^\S+@\S+\.\S+$/.test(email)) return setError(t.common.validation.email);
          setLoading(true);
          try {
            await forgotPassword(email);
            setSentTo(email);
          } catch (err) {
            setError(apiErrorMessage(err, t));
          } finally {
            setLoading(false);
          }
        }}
      >
        <Field label={f.email} htmlFor="email" error={error}>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {f.submit}
        </Button>
      </form>
      <Link href="/login" className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {f.back}
      </Link>
    </>
  );
}

export function ResetPasswordForm() {
  const { t } = useT();
  const r = t.auth.reset;
  const v = t.common.validation;
  const router = useLocalizedRouter();
  const sp = useSearchParams();
  const token = sp.get("token");
  const schema = z
    .object({
      email: z.string().email(v.email),
      password: z.string().refine((s) => passwordScore(s) >= 3 && s.length >= 8, v.passwordWeak),
      confirm: z.string(),
    })
    .refine((d) => d.password === d.confirm, { message: v.passwordMismatch, path: ["confirm"] });
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, formState, watch } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: sp.get("email") ?? "" } });
  const e = formState.errors;

  if (!token) {
    return (
      <>
        <AuthHeader icon={<KeyRound />} title={r.title} subtitle={r.invalidLink} />
        <Button size="lg" className="w-full" asChild>
          <Link href="/forgot-password">{r.requestNew}</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <AuthHeader icon={<KeyRound />} title={r.title} subtitle={r.subtitle} />
      <form
        className="space-y-4"
        noValidate
        onSubmit={handleSubmit(async (d) => {
          try {
            await resetPassword({ token, email: d.email, password: d.password });
            toast.success(r.success);
            router.replace("/login");
          } catch (err) {
            toast.error(apiErrorMessage(err, t));
          }
        })}
      >
        <Field label={r.email} htmlFor="email" error={e.email?.message}>
          <Input id="email" type="email" {...register("email")} />
        </Field>
        <Field label={r.password} htmlFor="password" error={e.password?.message}>
          <PasswordInput id="password" autoComplete="new-password" {...register("password")} />
        </Field>
        <PasswordStrength value={watch("password") ?? ""} />
        <Field label={r.confirm} htmlFor="confirm" error={e.confirm?.message}>
          <PasswordInput id="confirm" autoComplete="new-password" {...register("confirm")} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
          {r.submit}
        </Button>
      </form>
    </>
  );
}

export function VerifyEmail() {
  const { t } = useT();
  const vf = t.auth.verify;
  const verifyUrl = useSearchParams().get("verifyUrl");
  const user = useAuth((s) => s.user);
  const updateUser = useAuth((s) => s.updateUser);
  // Opened from the email link: confirm with the API (signed URL), then mark the cached profile verified.
  const verification = useQuery({
    queryKey: ["verify-email", verifyUrl],
    queryFn: async () => {
      await verifyEmail(verifyUrl!);
      updateUser({ emailVerified: true });
      return true;
    },
    enabled: !!verifyUrl,
    retry: false,
  });

  if (verifyUrl) {
    return (
      <div className="text-center">
        <div className={cn("mx-auto mb-6 flex size-16 items-center justify-center rounded-full", verification.isError ? "bg-primary-soft text-primary" : "bg-success-soft text-success")}>
          <MailCheck className="size-8" />
        </div>
        <h1 className="text-3xl font-semibold">{verification.isPending ? vf.verifying : verification.isError ? vf.title : vf.verified}</h1>
        {verification.isError && <p className="mt-3 text-muted-foreground">{vf.linkInvalid}</p>}
        <div className="mt-8 grid gap-2">
          {verification.isSuccess && (
            <Button size="lg" asChild>
              <Link href={user ? "/account" : "/login"}>{vf.goToAccount}</Link>
            </Button>
          )}
          {verification.isError && user && <ResendVerificationButton />}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary">
        <MailCheck className="size-8" />
      </div>
      <h1 className="text-3xl font-semibold">{vf.title}</h1>
      <p className="mt-3 text-muted-foreground">{fmt(vf.desc, { email: user?.email ?? "…" })}</p>
      <div className="mt-8 grid gap-2">
        {user && <ResendVerificationButton />}
        <Button size="lg" variant="ghost" asChild>
          <Link href="/products">{vf.continue}</Link>
        </Button>
      </div>
    </div>
  );
}

function ResendVerificationButton() {
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      size="lg"
      variant="outline"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await resendVerification();
          toast.success(t.auth.verify.resent);
        } catch (err) {
          toast.error(apiErrorMessage(err, t));
        } finally {
          setLoading(false);
        }
      }}
    >
      {t.auth.verify.resend}
    </Button>
  );
}
