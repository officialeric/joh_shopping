"use client";

import { BadgeCheck, Camera, MailWarning } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { Avatar } from "@/components/ui/primitives";
import { AccountHeader, SettingsSection, useAccountUser } from "@/components/account/account-shell";
import { resendVerification, updateProfile } from "@/lib/api/shop";
import { useT } from "@/lib/i18n/client";
import { normalizeTzPhone, TZ_PHONE_REGEX } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api/errors";
import { useAuth } from "@/stores";

export default function ProfilePage() {
  const { t } = useT();
  const p = t.account.profile;
  const user = useAccountUser();
  const updateUser = useAuth((s) => s.updateUser);
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 3) errs.name = t.common.validation.required;
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = t.common.validation.email;
    if (!TZ_PHONE_REGEX.test(form.phone.replace(/\s/g, "").replace(/^\+/, ""))) errs.phone = t.common.validation.phone;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const patch = { name: form.name.trim(), email: form.email.trim(), phone: normalizeTzPhone(form.phone) };
    try {
      updateUser(await updateProfile(patch));
      toast.success(p.saved);
    } catch (err) {
      toast.error(apiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AccountHeader title={p.title} subtitle={p.subtitle} />
      <div className="space-y-6">
        <SettingsSection title={p.photo} description={p.photoHint}>
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar name={user.name} src={user.avatar} className="size-20 text-xl" />
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full border-2 border-card bg-primary text-white"
                aria-label={p.changePhoto}
              >
                <Camera className="size-4" />
              </button>
            </div>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              {p.changePhoto}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) return toast.error(p.photoHint);
                const reader = new FileReader();
                reader.onload = () => {
                  updateUser({ avatar: String(reader.result) });
                  toast.success(p.saved);
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>
        </SettingsSection>
        <SettingsSection title={p.title} description={p.subtitle}>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
            <Field label={p.name} htmlFor="p-name" error={errors.name} className="sm:col-span-2">
              <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field
              label={
                <span className="flex w-full items-center justify-between">
                  {p.email}
                  {user.emailVerified ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-success">
                      <BadgeCheck className="size-3.5" />
                      {p.verified}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await resendVerification();
                          toast.success(t.auth.verify.resent);
                        } catch (err) {
                          toast.error(apiErrorMessage(err, t));
                        }
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-warning hover:underline"
                    >
                      <MailWarning className="size-3.5" />
                      {p.unverified} · {p.resend}
                    </button>
                  )}
                </span>
              }
              htmlFor="p-email"
              error={errors.email}
            >
              <Input id="p-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label={p.phone} htmlFor="p-phone" error={errors.phone}>
              <Input id="p-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" loading={saving}>
                {t.common.actions.saveChanges}
              </Button>
            </div>
          </form>
        </SettingsSection>
      </div>
    </>
  );
}
