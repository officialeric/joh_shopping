"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, CreditCard, Loader2, Lock, MapPin, ShoppingBag, Smartphone, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import type { Address, CustomerPreferences, DeliveryMethod, PaymentMethod, User } from "@/types";
import { PaymentMark, MOBILE_MONEY } from "@/components/brand/payment-logos";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Label, NativeSelect, RadioCard, RadioGroup, Textarea } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/feedback";
import { Link } from "@/components/ui/link";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/overlays";
import { Skeleton } from "@/components/ui/primitives";
import { expressAvailable, shippingFee } from "@/lib/cart";
import { variantLabel } from "@/lib/data/catalog";
import { useShop } from "@/lib/data/shop-context";
import { useCartSummary } from "@/lib/use-cart";
import { apiErrorMessage, apiFieldErrors } from "@/lib/api/errors";
import { getPreferences, myAddresses, paymentStatus, placeOrder, saveAddress as saveAddressApi } from "@/lib/api/shop";
import { useLocalizedRouter, useT } from "@/lib/i18n/client";
import { cn, fmt, formatTZS, normalizeTzPhone, sleep, TZ_PHONE_REGEX } from "@/lib/utils";
import { useAuth, useCart, useHydrated } from "@/stores";
import { ProductImage } from "./product-card";
import { CouponBox, SummaryLines } from "./cart-summary";

type Step = 0 | 1 | 2 | 3;

/** Waits for the session, saved addresses and preferences, then mounts the form with them. */
export function CheckoutFlow() {
  const hydrated = useHydrated();
  const user = useAuth((s) => s.user);
  const { data: addresses, isPending: addrPending } = useQuery({ queryKey: ["addresses", user?.id], queryFn: () => myAddresses(), enabled: !!user });
  const { data: prefs, isPending: prefsPending } = useQuery({ queryKey: ["prefs", user?.id], queryFn: () => getPreferences(), enabled: !!user });

  if (!hydrated || (user && (addrPending || prefsPending))) {
    return (
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }
  return <CheckoutForm user={user} addresses={addresses ?? []} prefs={prefs} />;
}

function CheckoutForm({ user, addresses, prefs }: { user: User | null; addresses: Address[]; prefs?: CustomerPreferences }) {
  const { t, locale } = useT();
  const c = t.shop.checkout;
  const router = useLocalizedRouter();
  const lines = useCart((s) => s.lines);
  const coupon = useCart((s) => s.coupon);
  const applyCoupon = useCart((s) => s.applyCoupon);
  const clearCart = useCart((s) => s.clear);
  const { stores: pickupStores, regions: tzRegions, zones, settings } = useShop();
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const enabled = settings.paymentMethods;
  const mobileMethods = MOBILE_MONEY.filter((m) => enabled[m]);

  const [step, setStep] = useState<Step>(0);
  const [contact, setContact] = useState({ name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" });
  const [delivery, setDelivery] = useState<DeliveryMethod>(prefs?.preferredDelivery ?? "standard");
  const [addressId, setAddressId] = useState<string>(defaultAddress?.id ?? "new");
  const [address, setAddress] = useState({ fullName: "", phone: "", region: "Dar es Salaam", district: "", street: "", landmark: "" });
  const [saveAddress, setSaveAddress] = useState(true);
  const [storeId, setStoreId] = useState(pickupStores[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<PaymentMethod>(prefs?.preferredPayment && enabled[prefs.preferredPayment] ? prefs.preferredPayment : (mobileMethods[0] ?? "card"));
  const [payerPhone, setPayerPhone] = useState(user?.phone ?? "");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [agree, setAgree] = useState(false);
  const [subscribe, setSubscribe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState<"idle" | "waiting" | "done">("idle");

  const selectedAddress = addresses.find((a) => a.id === addressId);
  const region = delivery === "pickup" ? undefined : (selectedAddress?.region ?? address.region);
  const canExpress = expressAvailable(zones, region);
  const effectiveDelivery: DeliveryMethod = delivery === "express" && !canExpress ? "standard" : delivery;
  const summary = useCartSummary({ region, delivery: effectiveDelivery });

  const v = t.common.validation;
  const phoneSchema = z.string().refine((s) => TZ_PHONE_REGEX.test(s.replace(/\s/g, "")), v.phone);

  const validate = (target: Step): boolean => {
    const e: Record<string, string> = {};
    const check = (key: string, schema: z.ZodType, value: unknown) => {
      const r = schema.safeParse(value);
      if (!r.success) e[key] = r.error.issues[0]?.message ?? v.required;
    };
    if (target === 0) {
      check(
        "name",
        z
          .string()
          .trim()
          .min(3, fmt(v.min, { n: 3 })),
        contact.name,
      );
      check("email", z.string().email(v.email), contact.email);
      check("phone", phoneSchema, contact.phone);
    }
    if (target === 1 && delivery !== "pickup" && addressId === "new") {
      check("region", z.string().min(1, v.required), address.region);
      check("district", z.string().trim().min(2, v.required), address.district);
      check("street", z.string().trim().min(4, v.required), address.street);
    }
    if (target === 2) {
      if (method === "card") {
        check(
          "cardNumber",
          z.string().refine((s) => /^\d{16}$/.test(s.replace(/\s/g, "")), v.cardNumber),
          card.number,
        );
        check("cardName", z.string().trim().min(3, v.required), card.name);
        check("expiry", z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, v.expiry), card.expiry);
        check("cvv", z.string().regex(/^\d{3,4}$/, v.cvv), card.cvv);
      } else if (method !== "cod") {
        check("payerPhone", phoneSchema, payerPhone);
      }
    }
    if (target === 3 && !agree) e.agree = v.terms;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = (from: Step) => {
    if (validate(from)) setStep(Math.min(3, from + 1) as Step);
  };

  /** Waits for a pushed mobile-money payment (PIN prompt) to settle, up to ~2 minutes. */
  const waitForPayment = async (reference: string) => {
    for (let i = 0; i < 40; i++) {
      await sleep(3000);
      const { status } = await paymentStatus(reference).catch(() => ({ status: "pending" }));
      if (status !== "pending") return status;
    }
    return "pending";
  };

  const pay = async () => {
    if (!validate(3)) return;
    setPaying("waiting");
    const addr =
      delivery === "pickup"
        ? undefined
        : selectedAddress
          ? {
              fullName: selectedAddress.fullName,
              phone: selectedAddress.phone,
              region: selectedAddress.region,
              district: selectedAddress.district,
              street: selectedAddress.street,
              landmark: selectedAddress.landmark,
            }
          : {
              fullName: address.fullName || contact.name,
              phone: normalizeTzPhone(address.phone || contact.phone),
              region: address.region,
              district: address.district,
              street: address.street,
              landmark: address.landmark || undefined,
            };
    try {
      const { order, payment } = await placeOrder({
        contact: { ...contact, phone: normalizeTzPhone(contact.phone) },
        delivery: effectiveDelivery,
        address: addr,
        pickupStoreId: delivery === "pickup" ? storeId : undefined,
        paymentMethod: method,
        payerPhone: method === "card" || method === "cod" ? undefined : normalizeTzPhone(payerPhone),
        cardLast4: method === "card" ? card.number.replace(/\s/g, "").slice(-4) : undefined,
        notes: notes || undefined,
        lines,
        couponCode: coupon?.code ?? null,
        subscribe,
        locale,
      });
      clearCart();
      if (user && saveAddress && addressId === "new" && addr) {
        await saveAddressApi({ ...addr, label: locale === "sw" ? "Anwani mpya" : "New address", isDefault: !addresses.length }).catch(() => {});
      }
      if (payment.status === "pending" && payment.action === "redirect" && payment.redirectUrl) {
        window.location.assign(payment.redirectUrl);
        return;
      }
      if (payment.status === "pending" && method !== "cod") {
        const status = await waitForPayment(payment.reference);
        if (status === "failed") toast.error(c.paymentFailed);
      } else if (payment.status === "failed") {
        toast.error(c.paymentFailed);
      }
      setPaying("done");
      router.replace(`/checkout/success?order=${order.number}`);
    } catch (err) {
      setPaying("idle");
      toast.error(apiErrorMessage(err, t));
      const fields = Object.keys(apiFieldErrors(err, t));
      if (fields.includes("couponCode")) applyCoupon(null);
      if (fields.some((f) => f.startsWith("contact"))) setStep(0);
      else if (fields.some((f) => f.startsWith("address") || f === "delivery" || f === "pickupStoreId")) setStep(1);
      else if (fields.some((f) => f === "payerPhone" || f === "paymentMethod" || f === "cardLast4")) setStep(2);
    }
  };

  if (summary.items.length === 0 && paying === "idle") {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<ShoppingBag />}
          title={c.emptyTitle}
          description={t.common.cart.emptyDesc}
          action={
            <Button asChild size="lg">
              <Link href="/products">{t.common.cart.startShopping}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const providerName = method === "card" ? t.common.payment.card : method === "cod" ? t.common.payment.cod : t.common.payment[method];
  const steps = [c.steps.contact, c.steps.delivery, c.steps.payment, c.steps.review];

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">{c.title}</h1>
        <ol className="flex items-center gap-2 text-xs font-medium sm:gap-3 sm:text-sm">
          {steps.map((label, i) => (
            <li key={label} className="flex items-center gap-2 sm:gap-3">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-[11px] font-semibold transition",
                  i < step ? "bg-success text-white" : i === step ? "bg-primary text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {i < step ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("hidden sm:inline", i === step ? "text-foreground" : "text-muted-foreground")}>{label}</span>
              {i < steps.length - 1 && <span className="h-px w-4 bg-border sm:w-8" />}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          {/* 1. Contact */}
          <StepCard index={0} step={step} title={c.contactTitle} onEdit={() => setStep(0)} summary={`${contact.name} · ${contact.email} · ${contact.phone}`}>
            {!user && (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted px-4 py-3 text-sm">
                <span className="text-muted-foreground">
                  {c.haveAccount} <span className="hidden sm:inline">{c.guestNote}</span>
                </span>
                <Link href="/login?next=/checkout" className="font-semibold text-primary hover:underline">
                  {c.loginForFaster} →
                </Link>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={c.fullName} htmlFor="name" error={errors.name} className="sm:col-span-2">
                <Input
                  id="name"
                  autoComplete="name"
                  value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                  aria-invalid={!!errors.name}
                />
              </Field>
              <Field label={c.email} htmlFor="email" error={errors.email}>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  aria-invalid={!!errors.email}
                />
              </Field>
              <Field label={c.phone} htmlFor="phone" error={errors.phone}>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder={c.phonePlaceholder}
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                  aria-invalid={!!errors.phone}
                />
              </Field>
            </div>
            <Button size="lg" className="mt-6" onClick={() => next(0)}>
              {t.common.actions.continue}
            </Button>
          </StepCard>

          {/* 2. Delivery */}
          <StepCard
            index={1}
            step={step}
            title={c.deliveryTitle}
            onEdit={() => setStep(1)}
            summary={
              delivery === "pickup"
                ? `${t.common.delivery.pickup} · ${pickupStores.find((s) => s.id === storeId)?.name}`
                : `${t.common.delivery[effectiveDelivery]} · ${selectedAddress ? `${selectedAddress.street}, ${selectedAddress.region}` : `${address.street}, ${address.district}, ${address.region}`}`
            }
          >
            <RadioGroup value={delivery} onValueChange={(val) => setDelivery(val as DeliveryMethod)} className="sm:grid-cols-3">
              {(["standard", "express", "pickup"] as const).map((m) => {
                const fee = m === "pickup" ? 0 : shippingFee(zones, region ?? "Dar es Salaam", m, summary.subtotal - summary.discount);
                const disabled = m === "express" && !canExpress && delivery !== "pickup";
                return (
                  <RadioCard key={m} value={m} className={cn(disabled && "opacity-50")}>
                    <span className="block text-sm font-semibold">{t.common.delivery[m]}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{t.common.delivery[`${m}Desc` as const]}</span>
                    <span className="mt-2 block text-sm font-semibold">{fee === 0 ? t.common.cart.free : fee == null ? "—" : formatTZS(fee)}</span>
                  </RadioCard>
                );
              })}
            </RadioGroup>
            {delivery === "express" && !canExpress && <p className="mt-3 text-xs text-warning">{c.expressUnavailable}</p>}

            {delivery === "pickup" ? (
              <div className="mt-6">
                <p className="mb-3 text-sm font-semibold">{c.pickupTitle}</p>
                <RadioGroup value={storeId} onValueChange={setStoreId}>
                  {pickupStores.map((s) => (
                    <RadioCard key={s.id} value={s.id}>
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <Store className="size-4 text-primary" />
                        {s.name}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">{s.address}</span>
                      <span className="block text-xs text-muted-foreground">{s.hours[locale]}</span>
                    </RadioCard>
                  ))}
                </RadioGroup>
              </div>
            ) : (
              <div className="mt-6">
                <p className="mb-3 text-sm font-semibold">{c.addressTitle}</p>
                {addresses.length > 0 && (
                  <RadioGroup value={addressId} onValueChange={setAddressId} className="mb-4">
                    {addresses.map((a) => (
                      <RadioCard key={a.id} value={a.id}>
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          <MapPin className="size-4 text-primary" />
                          {a.label}
                          {a.isDefault && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{t.account.addresses.default}</span>}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {a.fullName} · {a.phone}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {a.street}, {a.district}, {a.region}
                        </span>
                      </RadioCard>
                    ))}
                    <RadioCard value="new">
                      <span className="text-sm font-semibold">+ {c.newAddress}</span>
                    </RadioCard>
                  </RadioGroup>
                )}
                {addressId === "new" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={c.region} htmlFor="region" error={errors.region}>
                      <NativeSelect id="region" value={address.region} onChange={(e) => setAddress({ ...address, region: e.target.value })}>
                        {tzRegions.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </NativeSelect>
                    </Field>
                    <Field label={c.district} htmlFor="district" error={errors.district}>
                      <Input
                        id="district"
                        value={address.district}
                        onChange={(e) => setAddress({ ...address, district: e.target.value })}
                        aria-invalid={!!errors.district}
                      />
                    </Field>
                    <Field label={c.street} htmlFor="street" error={errors.street} className="sm:col-span-2">
                      <Input
                        id="street"
                        autoComplete="street-address"
                        placeholder={c.streetPlaceholder}
                        value={address.street}
                        onChange={(e) => setAddress({ ...address, street: e.target.value })}
                        aria-invalid={!!errors.street}
                      />
                    </Field>
                    <Field label={c.landmark} htmlFor="landmark" optional={t.common.misc.optional} className="sm:col-span-2">
                      <Input
                        id="landmark"
                        placeholder={c.landmarkPlaceholder}
                        value={address.landmark}
                        onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                      />
                    </Field>
                    {user && (
                      <div className="flex items-center gap-2.5 sm:col-span-2">
                        <Checkbox id="save-addr" checked={saveAddress} onCheckedChange={(v) => setSaveAddress(!!v)} />
                        <Label htmlFor="save-addr" className="font-normal">
                          {c.saveAddress}
                        </Label>
                      </div>
                    )}
                  </div>
                )}
                <Field label={c.notes} htmlFor="notes" optional={t.common.misc.optional} className="mt-4">
                  <Textarea id="notes" className="min-h-20" placeholder={c.notesPlaceholder} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Field>
              </div>
            )}
            <Button size="lg" className="mt-6" onClick={() => next(1)}>
              {t.common.actions.continue}
            </Button>
          </StepCard>

          {/* 3. Payment */}
          <StepCard
            index={2}
            step={step}
            title={c.paymentTitle}
            onEdit={() => setStep(2)}
            summary={method === "card" ? `${t.common.payment.card} •••• ${card.number.replace(/\s/g, "").slice(-4)}` : `${providerName} · ${payerPhone}`}
          >
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              <Smartphone className="size-4" />
              {t.common.payment.mobileMoney}
            </p>
            <RadioGroup value={method} onValueChange={(val) => setMethod(val as PaymentMethod)} className="grid-cols-2 sm:grid-cols-3">
              {mobileMethods.map((m) => (
                <RadioCard key={m} value={m} className="p-3">
                  <PaymentMark method={m} className="mb-2 h-9 min-w-20 px-2" />
                  <span className="block text-sm font-semibold">{t.common.payment[m as Exclude<PaymentMethod, "card" | "cod">]}</span>
                  <span className="block text-[11px] text-muted-foreground">{t.common.payment[`${m}Desc` as "mpesaDesc"]}</span>
                </RadioCard>
              ))}
            </RadioGroup>
            {(enabled.card || enabled.cod) && (
              <>
                <p className="mt-6 mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  <CreditCard className="size-4" />
                  {enabled.card ? t.common.payment.card : t.common.payment.cod}
                </p>
                <RadioGroup value={method} onValueChange={(val) => setMethod(val as PaymentMethod)}>
                  {enabled.card && (
                    <RadioCard value="card">
                      <span className="flex items-center gap-3">
                        <PaymentMark method="card" className="h-9 min-w-20 px-2" />
                        <span>
                          <span className="block text-sm font-semibold">{t.common.payment.card}</span>
                          <span className="block text-xs text-muted-foreground">{t.common.payment.cardDesc}</span>
                        </span>
                      </span>
                    </RadioCard>
                  )}
                  {enabled.cod && (
                    <RadioCard value="cod">
                      <span className="flex items-center gap-3">
                        <PaymentMark method="cod" className="h-9 min-w-20 px-2" />
                        <span>
                          <span className="block text-sm font-semibold">{t.common.payment.cod}</span>
                          <span className="block text-xs text-muted-foreground">{t.common.payment.codDesc}</span>
                        </span>
                      </span>
                    </RadioCard>
                  )}
                </RadioGroup>
              </>
            )}

            {method !== "cod" && (
              <div className="mt-6 rounded-2xl border border-border bg-muted/50 p-5">
                {method === "card" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={c.cardNumber} htmlFor="cc" error={errors.cardNumber} className="sm:col-span-2">
                      <Input
                        id="cc"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        placeholder="4242 4242 4242 4242"
                        value={card.number}
                        onChange={(e) =>
                          setCard({
                            ...card,
                            number: e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 16)
                              .replace(/(\d{4})(?=\d)/g, "$1 "),
                          })
                        }
                        aria-invalid={!!errors.cardNumber}
                      />
                    </Field>
                    <Field label={c.cardName} htmlFor="cc-name" error={errors.cardName} className="sm:col-span-2">
                      <Input id="cc-name" autoComplete="cc-name" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
                    </Field>
                    <Field label={c.expiry} htmlFor="cc-exp" error={errors.expiry}>
                      <Input
                        id="cc-exp"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="MM/YY"
                        value={card.expiry}
                        onChange={(e) => {
                          const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                          setCard({ ...card, expiry: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d });
                        }}
                      />
                    </Field>
                    <Field label={c.cvv} htmlFor="cc-cvv" error={errors.cvv}>
                      <Input
                        id="cc-cvv"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        type="password"
                        value={card.cvv}
                        onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      />
                    </Field>
                    <p className="flex items-start gap-2 text-xs text-muted-foreground sm:col-span-2">
                      <Lock className="mt-0.5 size-3.5 shrink-0" />
                      {c.cardInfo}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Field label={fmt(c.payerPhone, { provider: providerName })} htmlFor="payer" error={errors.payerPhone}>
                      <Input
                        id="payer"
                        type="tel"
                        placeholder={c.phonePlaceholder}
                        value={payerPhone}
                        onChange={(e) => setPayerPhone(e.target.value)}
                        aria-invalid={!!errors.payerPhone}
                      />
                    </Field>
                    <p className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Lock className="mt-0.5 size-3.5 shrink-0" />
                      {c.pushInfo}
                    </p>
                  </div>
                )}
              </div>
            )}
            <Button size="lg" className="mt-6" onClick={() => next(2)}>
              {t.common.actions.continue}
            </Button>
          </StepCard>

          {/* 4. Review */}
          <StepCard index={3} step={step} title={c.reviewTitle} onEdit={() => setStep(3)}>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-xl bg-muted p-4">
                <p className="text-xs text-muted-foreground">{c.steps.contact}</p>
                <p className="mt-1 font-medium">{contact.name}</p>
                <p className="text-muted-foreground">{contact.phone}</p>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <p className="text-xs text-muted-foreground">{delivery === "pickup" ? c.pickupAt : c.deliverTo}</p>
                <p className="mt-1 font-medium">
                  {delivery === "pickup" ? pickupStores.find((s) => s.id === storeId)?.name : (selectedAddress?.label ?? address.district)}
                </p>
                <p className="text-muted-foreground">{delivery === "pickup" ? t.common.delivery.pickupDesc : region}</p>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <p className="text-xs text-muted-foreground">{c.payWith}</p>
                <div className="mt-1.5">
                  <PaymentMark method={method} />
                </div>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="flex items-start gap-2.5">
                <Checkbox id="agree" checked={agree} onCheckedChange={(v) => setAgree(!!v)} aria-invalid={!!errors.agree} className="mt-0.5" />
                <Label htmlFor="agree" className="leading-relaxed font-normal">
                  {c.agree.split(/(\{terms\}|\{returns\})/).map((part, i) =>
                    part === "{terms}" ? (
                      <Link key={i} href="/policies/terms" target="_blank" className="font-medium text-primary hover:underline">
                        {c.termsLink}
                      </Link>
                    ) : part === "{returns}" ? (
                      <Link key={i} href="/policies/returns" target="_blank" className="font-medium text-primary hover:underline">
                        {c.returnsLink}
                      </Link>
                    ) : (
                      part
                    ),
                  )}
                </Label>
              </div>
              {errors.agree && <p className="text-xs font-medium text-destructive">{errors.agree}</p>}
              <div className="flex items-center gap-2.5">
                <Checkbox id="subscribe" checked={subscribe} onCheckedChange={(v) => setSubscribe(!!v)} />
                <Label htmlFor="subscribe" className="font-normal">
                  {c.subscribe}
                </Label>
              </div>
            </div>
            <Button size="xl" className="mt-6 w-full sm:w-auto" onClick={pay} loading={paying !== "idle"}>
              <Lock className="size-4" />
              {fmt(c.placeOrder, { amount: formatTZS(summary.total) })}
            </Button>
          </StepCard>
        </div>

        <aside className="h-fit lg:sticky lg:top-6">
          <div className="space-y-5 rounded-[24px] border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{c.orderSummary}</h2>
              <Link href="/cart" className="text-sm font-medium text-primary hover:underline">
                {c.edit}
              </Link>
            </div>
            <ul className="max-h-72 space-y-4 overflow-y-auto pr-1">
              {summary.items.map(({ product, variant, line, lineTotal }) => (
                <li key={variant.id} className="flex items-center gap-3">
                  <div className="relative size-16 shrink-0 rounded-xl bg-surface p-1.5">
                    <ProductImage product={product} color={variant.color} view={product.art.kind === "phone" ? "back" : undefined} />
                    <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
                      {line.qty}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{variantLabel(product, variant, locale)}</p>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{formatTZS(lineTotal)}</span>
                </li>
              ))}
            </ul>
            <CouponBox summary={summary} />
            <SummaryLines summary={summary} />
          </div>
        </aside>
      </div>

      <Dialog open={paying !== "idle"}>
        <DialogContent hideClose className="max-w-sm text-center" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary-soft">
            {paying === "done" ? (
              <Check className="size-9 text-success" />
            ) : method === "card" ? (
              <CreditCard className="size-9 text-primary" />
            ) : (
              <Smartphone className="size-9 animate-pulse text-primary" />
            )}
          </div>
          <DialogTitle className="text-center">{method === "card" ? c.waitingCard : c.waitingTitle}</DialogTitle>
          <DialogDescription className="text-center">
            {method === "card" ? c.waitingHint : fmt(c.waitingDesc, { amount: formatTZS(summary.total), phone: payerPhone, provider: providerName })}
          </DialogDescription>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {c.waitingHint}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StepCard({
  index,
  step,
  title,
  summary,
  onEdit,
  children,
}: {
  index: Step;
  step: Step;
  title: string;
  summary?: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  const { t } = useT();
  const done = index < step;
  const active = index === step;
  return (
    <section className={cn("rounded-[24px] border bg-card transition", active ? "border-foreground/15 shadow-soft" : "border-border")}>
      <header className="flex items-center gap-3 p-5 sm:p-6">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
            done ? "bg-success text-white" : active ? "bg-primary text-white" : "bg-muted text-muted-foreground",
          )}
        >
          {done ? <Check className="size-4" strokeWidth={3} /> : index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className={cn("font-semibold", !active && !done && "text-muted-foreground")}>{title}</h2>
          {done && summary && <p className="truncate text-sm text-muted-foreground">{summary}</p>}
        </div>
        {done && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            {t.shop.checkout.edit}
          </Button>
        )}
      </header>
      {active && <div className="animate-[fade-in_0.3s_ease-out] px-5 pb-6 sm:px-6">{children}</div>}
    </section>
  );
}
