"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCcw, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import type { ReturnRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, RadioCard, RadioGroup, Textarea } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/feedback";
import { Link } from "@/components/ui/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/overlays";
import { Badge, Skeleton } from "@/components/ui/primitives";
import { AccountHeader, useAccountUser } from "@/components/account/account-shell";
import { useMyOrders } from "@/components/account/order-card";
import { myReturns, requestReturn } from "@/lib/api/shop";
import { useT } from "@/lib/i18n/client";
import { fmt, formatDate } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api/errors";

function returnStatusVariant(s: ReturnRequest["status"]) {
  if (s === "rejected") return "danger" as const;
  if (s === "completed" || s === "refunded" || s === "repaired") return "success" as const;
  if (s === "requested") return "warning" as const;
  return "info" as const;
}

function ReturnsContent() {
  const { t, locale } = useT();
  const r = t.account.returns;
  const user = useAccountUser();
  const qc = useQueryClient();
  const preselect = useSearchParams().get("order");
  const { data, isLoading } = useQuery({ queryKey: ["returns", user.id], queryFn: () => myReturns() });
  const { data: orders } = useMyOrders();
  const delivered = orders?.filter((o) => o.status === "delivered") ?? [];

  const [open, setOpen] = useState(!!preselect);
  const [type, setType] = useState<ReturnRequest["type"]>("return");
  const [orderId, setOrderId] = useState(preselect ?? "");
  const [item, setItem] = useState("");
  const [reason, setReason] = useState<keyof typeof r.reasons>("defective");
  const [details, setDetails] = useState("");
  const [imei, setImei] = useState("");
  const [resolution, setResolution] = useState<NonNullable<ReturnRequest["resolution"]>>("refund");
  const [saving, setSaving] = useState(false);

  const order = delivered.find((o) => o.id === orderId);
  const selectedItem = order?.items.find((i) => i.variantId === item) ?? order?.items[0];
  const selectOrder = (id: string) => {
    setOrderId(id);
    const first = delivered.find((o) => o.id === id)?.items[0];
    setItem(first?.variantId ?? "");
    setImei(first?.imei?.[0] ?? "");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const it = selectedItem;
    if (!order || !it || details.trim().length < 5) return toast.error(t.common.validation.required);
    setSaving(true);
    try {
      await requestReturn({
        orderId: order.id,
        productName: `${it.name} (${it.variantLabel})`,
        type,
        reason: r.reasons[reason],
        details,
        imei: imei || undefined,
        resolution: type === "warranty" ? "repair" : resolution,
      });
      setOpen(false);
      setDetails("");
      qc.invalidateQueries({ queryKey: ["returns", user.id] });
      toast.success(r.submitted);
    } catch (err) {
      toast.error(apiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AccountHeader
        title={r.title}
        subtitle={r.subtitle}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus />
            {r.new}
          </Button>
        }
      />
      <Link href="/policies/returns" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
        <ShieldCheck className="size-4" />
        {r.policy}
      </Link>
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : !data?.length ? (
        <EmptyState icon={<RotateCcw />} title={r.empty} description={r.emptyDesc} className="rounded-[24px] border border-dashed border-border" />
      ) : (
        <div className="space-y-3">
          {data.map((x) => (
            <article key={x.id} className="rounded-[20px] border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-display font-semibold">{x.number}</span>
                  <Badge variant="outline">{x.type === "warranty" ? r.typeWarranty : r.typeReturn}</Badge>
                </div>
                <Badge variant={returnStatusVariant(x.status)}>{t.common.returnStatus[x.status]}</Badge>
              </div>
              <p className="mt-3 font-medium">{x.productName}</p>
              <p className="text-sm text-muted-foreground">
                {x.reason} — {x.details}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {r.order}: {x.orderNumber}
                </span>
                {x.imei && <span className="font-mono">IMEI: {x.imei}</span>}
                {x.resolution && <span>{r.resolutions[x.resolution]}</span>}
                <span>{fmt(r.requested, { date: formatDate(x.createdAt, locale) })}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{r.new}</DialogTitle>
            <DialogDescription>{r.subtitle}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            <RadioGroup value={type} onValueChange={(v) => setType(v as ReturnRequest["type"])} className="sm:grid-cols-2">
              <RadioCard value="return">
                <span className="block text-sm font-semibold">{r.typeReturn}</span>
                <span className="block text-xs text-muted-foreground">{r.typeReturnDesc}</span>
              </RadioCard>
              <RadioCard value="warranty">
                <span className="block text-sm font-semibold">{r.typeWarranty}</span>
                <span className="block text-xs text-muted-foreground">{r.typeWarrantyDesc}</span>
              </RadioCard>
            </RadioGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={r.order} htmlFor="r-order">
                <NativeSelect id="r-order" value={orderId} onChange={(e) => selectOrder(e.target.value)}>
                  <option value="">{r.selectOrder}</option>
                  {delivered.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.number} · {formatDate(o.createdAt, locale)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={r.item} htmlFor="r-item">
                <NativeSelect
                  id="r-item"
                  value={selectedItem?.variantId ?? ""}
                  onChange={(e) => {
                    setItem(e.target.value);
                    setImei(order?.items.find((i) => i.variantId === e.target.value)?.imei?.[0] ?? "");
                  }}
                  disabled={!order}
                >
                  <option value="">{r.selectItem}</option>
                  {order?.items.map((i) => (
                    <option key={i.variantId} value={i.variantId}>
                      {i.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={r.reason} htmlFor="r-reason">
                <NativeSelect id="r-reason" value={reason} onChange={(e) => setReason(e.target.value as keyof typeof r.reasons)}>
                  {Object.entries(r.reasons).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={r.imei} htmlFor="r-imei" hint={r.imeiHint} optional={t.common.misc.optional}>
                <Input id="r-imei" inputMode="numeric" className="font-mono" value={imei} onChange={(e) => setImei(e.target.value.replace(/\D/g, "").slice(0, 15))} />
              </Field>
            </div>
            <Field label={r.details} htmlFor="r-details">
              <Textarea id="r-details" placeholder={r.detailsPlaceholder} value={details} onChange={(e) => setDetails(e.target.value)} />
            </Field>
            {type === "return" && (
              <Field label={r.resolution}>
                <div className="flex flex-wrap gap-2">
                  {(["refund", "replacement"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setResolution(k)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${resolution === k ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border"}`}
                    >
                      {r.resolutions[k]}
                    </button>
                  ))}
                </div>
              </Field>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t.common.actions.cancel}
              </Button>
              <Button type="submit" loading={saving}>
                {r.submit}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ReturnsPage() {
  return (
    <Suspense>
      <ReturnsContent />
    </Suspense>
  );
}
