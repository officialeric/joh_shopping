"use client";

import { Laptop, LogOut, Smartphone, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput, Switch } from "@/components/ui/form-controls";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/overlays";
import { Badge } from "@/components/ui/primitives";
import { AccountHeader, SettingsSection, useAccountUser } from "@/components/account/account-shell";
import { PasswordStrength, passwordScore } from "@/components/auth/auth-forms";
import { changePassword, deleteAccount, updateProfile } from "@/lib/api/shop";
import { apiErrorMessage } from "@/lib/api/errors";
import { ApiError } from "@/lib/api/core";
import { useLocalizedRouter, useT } from "@/lib/i18n/client";
import { fmt } from "@/lib/utils";
import { useAuth } from "@/stores";

export default function SecurityPage() {
  const { t } = useT();
  const s = t.account.security;
  const v = t.common.validation;
  const router = useLocalizedRouter();
  const user = useAccountUser();
  const setUser = useAuth((st) => st.setUser);
  const updateUser = useAuth((st) => st.updateUser);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmWord, setConfirmWord] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [sessions, setSessions] = useState([
    { id: "1", icon: Laptop, name: "Chrome · macOS", place: "Dar es Salaam", current: true, when: t.common.misc.today },
    { id: "2", icon: Smartphone, name: "Safari · iPhone", place: "Dar es Salaam", current: false, when: t.common.misc.yesterday },
    { id: "3", icon: Smartphone, name: "Chrome · Android", place: "Arusha", current: false, when: "12/10/2026" },
  ]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!pw.current) errs.current = v.required;
    if (passwordScore(pw.next) < 3 || pw.next.length < 8) errs.next = v.passwordWeak;
    if (pw.next !== pw.confirm) errs.confirm = v.passwordMismatch;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      toast.success(s.updated);
    } catch (err) {
      if (err instanceof ApiError) setErrors({ current: s.wrongPassword });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AccountHeader title={s.title} subtitle={s.subtitle} />
      <div className="space-y-6">
        <SettingsSection title={s.changePassword}>
          <form onSubmit={submit} className="grid max-w-md gap-4" noValidate>
            <Field label={s.current} htmlFor="s-current" error={errors.current}>
              <PasswordInput id="s-current" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
            </Field>
            <Field label={s.new} htmlFor="s-new" error={errors.next}>
              <PasswordInput id="s-new" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            </Field>
            <PasswordStrength value={pw.next} />
            <Field label={s.confirm} htmlFor="s-confirm" error={errors.confirm}>
              <PasswordInput id="s-confirm" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </Field>
            <Button type="submit" className="w-fit" loading={saving}>
              {s.changePassword}
            </Button>
          </form>
        </SettingsSection>

        <SettingsSection title={s.twoFactor} description={s.twoFactorDesc}>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
            <div>
              <p className="font-medium">{user.twoFactor ? s.twoFactorOn : s.twoFactorOff}</p>
              <p className="text-sm text-muted-foreground">SMS → {user.phone}</p>
            </div>
            <Switch
              checked={user.twoFactor}
              onCheckedChange={async (checked) => {
                await updateProfile({ twoFactor: checked });
                updateUser({ twoFactor: checked });
                toast.success(checked ? s.twoFactorOn : s.twoFactorOff);
              }}
              aria-label={s.twoFactor}
            />
          </div>
        </SettingsSection>

        <SettingsSection title={s.sessions}>
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {sessions.map((x) => (
              <li key={x.id} className="flex items-center gap-4 p-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
                  <x.icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {x.name}
                    {x.current && <Badge variant="success">{s.thisDevice}</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {x.place} · {fmt(s.lastActive, { time: x.when })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {sessions.length > 1 && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSessions((list) => list.filter((x) => x.current));
                toast.success(s.signedOutOthers);
              }}
            >
              <LogOut />
              {s.signOutOthers}
            </Button>
          )}
        </SettingsSection>

        <section className="rounded-[24px] border border-destructive/30 bg-primary-soft/30 p-6 md:p-8">
          <h2 className="font-semibold text-destructive">{s.danger}</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{s.deleteDesc}</p>
          <Button variant="destructive" className="mt-4" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            {s.deleteAccount}
          </Button>
        </section>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{s.deleteAccount}</DialogTitle>
            <DialogDescription>{s.deleteDesc}</DialogDescription>
          </DialogHeader>
          <Field label={s.current} htmlFor="del-password">
            <PasswordInput id="del-password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
          </Field>
          <Field label={s.deleteConfirm} htmlFor="del-word">
            <Input id="del-word" value={confirmWord} onChange={(e) => setConfirmWord(e.target.value)} />
          </Field>
          <Button
            variant="destructive"
            disabled={confirmWord !== s.deleteWord || !deletePassword}
            loading={deleting}
            onClick={async () => {
              setDeleting(true);
              try {
                await deleteAccount(deletePassword);
                setUser(null);
                toast.success(s.deleted);
                router.replace("/");
              } catch (err) {
                toast.error(apiErrorMessage(err, t));
              } finally {
                setDeleting(false);
              }
            }}
          >
            {s.deleteAccount}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
