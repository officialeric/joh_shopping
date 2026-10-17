"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Lock, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { PaymentMethod } from "@/types";
import { MOBILE_MONEY, PaymentMark } from "@/components/brand/payment-logos";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/feedback";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/overlays";
import { Badge, Skeleton } from "@/components/ui/primitives";
import { AccountHeader, useAccountUser } from "@/components/account/account-shell";
import { addSavedPayment, mySavedPayments, removeSavedPayment, setDefaultSavedPayment } from "@/lib/api/shop";
import { useT } from "@/lib/i18n/client";
import { normalizeTzPhone, TZ_PHONE_REGEX } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api/errors";

export default function PaymentMethodsPage() {
  const { t } = useT();
  const p = t.account.payments;
  const user = useAccountUser();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["saved-payments", user.id], queryFn: () => mySavedPayments() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["saved-payments", user.id] });
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("mpesa");
  const [phone, setPhone] = useState("");
  const [card, setCard] = useState({ number: "", expiry: "" });
  const [error, setError] = useState("");

  const label = (m: PaymentMethod) => (m === "card" ? t.common.payment.card : t.common.payment[m]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    let text = "";
    if (method === "card") {
      const digits = card.number.replace(/\D/g, "");
      if (digits.length !== 16 || !/^\d{2}\/\d{2}$/.test(card.expiry)) return setError(t.common.validation.cardNumber);
      text = `${digits.startsWith("5") ? "Mastercard" : "Visa"} •••• ${digits.slice(-4)} · ${card.expiry}`;
    } else {
      if (!TZ_PHONE_REGEX.test(phone.replace(/\s/g, ""))) return setError(t.common.validation.phone);
      text = normalizeTzPhone(phone).replace(/(\+255)(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4");
    }
    try {
      await addSavedPayment(method, text);
      setOpen(false);
      setPhone("");
      setCard({ number: "", expiry: "" });
      setError("");
      refresh();
      toast.success(p.added);
    } catch (err) {
      toast.error(apiErrorMessage(err, t));
    }
  };

  return (
    <>
      <AccountHeader
        title={p.title}
        subtitle={p.subtitle}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus />
            {p.add}
          </Button>
        }
      />
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : !data?.length ? (
        <EmptyState icon={<CreditCard />} title={p.empty} className="rounded-[24px] border border-dashed border-border" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((m) => (
            <div
              key={m.id}
              className={`relative overflow-hidden rounded-[20px] p-6 text-white ${m.method === "card" ? "bg-gradient-to-br from-neutral-800 to-neutral-950" : "bg-brand-gradient"}`}
            >
              <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/10" />
              <div className="relative flex items-start justify-between">
                <PaymentMark method={m.method} />
                {m.isDefault && <Badge className="bg-white/20 text-white">{p.default}</Badge>}
              </div>
              <p className="relative mt-8 font-mono text-lg tracking-wider">{m.label}</p>
              <p className="relative text-sm text-white/70">{label(m.method)}</p>
              <div className="relative mt-5 flex gap-2">
                {!m.isDefault && (
                  <Button
                    size="sm"
                    variant="white"
                    onClick={async () => {
                      await setDefaultSavedPayment(m.id).catch((err) => toast.error(apiErrorMessage(err, t)));
                      refresh();
                    }}
                  >
                    {p.setDefault}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto text-white hover:bg-white/15"
                  onClick={async () => {
                    try {
                      await removeSavedPayment(m.id);
                      refresh();
                      toast.success(p.removed);
                    } catch (err) {
                      toast.error(apiErrorMessage(err, t));
                    }
                  }}
                  aria-label={t.common.actions.remove}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="size-4" />
        {p.secureNote}
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{p.add}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            <Field label={p.provider} htmlFor="pm-provider">
              <NativeSelect id="pm-provider" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {[...MOBILE_MONEY, "card" as const].map((m) => (
                  <option key={m} value={m}>
                    {label(m)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {method === "card" ? (
              <div className="grid grid-cols-[1fr_120px] gap-3">
                <Field label={p.cardNumber} htmlFor="pm-card">
                  <Input
                    id="pm-card"
                    inputMode="numeric"
                    value={card.number}
                    onChange={(e) => setCard({ ...card, number: e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ") })}
                  />
                </Field>
                <Field label={p.expiry} htmlFor="pm-exp">
                  <Input
                    id="pm-exp"
                    placeholder="MM/YY"
                    value={card.expiry}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setCard({ ...card, expiry: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d });
                    }}
                  />
                </Field>
              </div>
            ) : (
              <Field label={p.phone} htmlFor="pm-phone">
                <Input id="pm-phone" type="tel" placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
            )}
            {error && <p className="text-xs font-medium text-destructive">{error}</p>}
            <Button type="submit">{t.common.actions.save}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
