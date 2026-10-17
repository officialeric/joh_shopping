"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Clock, Eye, Undo2, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Payment, PaymentMethod } from "@/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/overlays";
import { AdminPageHeader, RequirePermission, useAdmin } from "@/components/admin/admin-shell";
import { DataTable, useTableState, type Column } from "@/components/admin/data-table";
import { MethodCell, PaymentStatusBadge, StatCard } from "@/components/admin/widgets";
import { MOBILE_MONEY } from "@/components/brand/payment-logos";
import { refundPayment } from "@/lib/api/admin";
import { useAdminList, useInvalidateAdmin } from "@/lib/api/hooks";
import { apiData } from "@/lib/api/core";
import { apiErrorMessage } from "@/lib/api/errors";
import { useLocalizedRouter, useT } from "@/lib/i18n/client";
import { fmt, formatDateTime, formatTZS } from "@/lib/utils";

export default function AdminPaymentsPage() {
  const { t, locale } = useT();
  const p = t.admin.payments;
  const router = useLocalizedRouter();
  const { can } = useAdmin();
  const refresh = useInvalidateAdmin();
  const state = useTableState({ sort: "-createdAt" });
  const { data, isLoading } = useAdminList("payments", state.params);
  const [refunding, setRefunding] = useState<Payment | null>(null);
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: totals } = useQuery({
    queryKey: ["admin", "payments", "totals"],
    queryFn: () => apiData<{ collected: number; pending: number; failed: number; refunded: number }>("/admin/payments-summary"),
  });

  const methodLabel = (m: PaymentMethod) => (m === "card" ? t.common.payment.card : t.common.payment[m]);
  const columns: Column<Payment>[] = [
    {
      key: "ref",
      header: p.reference,
      cell: (r) => (
        <div>
          <p className="font-mono text-xs font-medium">{r.reference}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(r.createdAt, locale)}</p>
        </div>
      ),
      csv: (r) => r.reference,
    },
    { key: "order", header: t.admin.orders.number, sort: "orderNumber", cell: (r) => <span className="font-medium">{r.orderNumber}</span>, csv: (r) => r.orderNumber },
    { key: "customer", header: t.admin.common.customer, sort: "customerName", cell: (r) => r.customerName, csv: (r) => r.customerName },
    {
      key: "method",
      header: p.method,
      cell: (r) => (
        <div className="flex items-center gap-2">
          <MethodCell method={r.method} />
          <span className="text-xs text-muted-foreground">{r.payerPhone ?? (r.cardLast4 ? `•••• ${r.cardLast4}` : "")}</span>
        </div>
      ),
      csv: (r) => r.method,
    },
    { key: "status", header: t.admin.common.status, cell: (r) => <PaymentStatusBadge status={r.status} />, csv: (r) => r.status },
    {
      key: "amount",
      header: t.admin.common.amount,
      sort: "amount",
      className: "text-right",
      cell: (r) => (
        <div className="text-right">
          <p className="font-medium tabular-nums">{formatTZS(r.amount)}</p>
          {r.refunded > 0 && <p className="text-xs text-destructive tabular-nums">−{formatTZS(r.refunded)}</p>}
        </div>
      ),
      csv: (r) => r.amount,
    },
  ];

  return (
    <RequirePermission perm="payments.view">
      <AdminPageHeader title={p.title} subtitle={p.subtitle} />
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard tone="brand" label={p.collected} value={formatTZS(totals?.collected ?? 0, { compact: true })} icon={Wallet} />
        <StatCard label={p.pending} value={formatTZS(totals?.pending ?? 0, { compact: true })} icon={Clock} />
        <StatCard label={p.failed} value={formatTZS(totals?.failed ?? 0, { compact: true })} icon={CircleAlert} />
        <StatCard label={p.refundedTotal} value={formatTZS(totals?.refunded ?? 0, { compact: true })} icon={Undo2} />
      </div>
      <DataTable
        data={data}
        loading={isLoading}
        columns={columns}
        state={state}
        exportName="payments"
        filters={[
          { key: "method", label: p.method, options: [...MOBILE_MONEY, "card" as const].map((m) => ({ value: m, label: methodLabel(m) })) },
          {
            key: "status",
            label: t.admin.common.status,
            options: (["paid", "pending", "failed", "refunded", "partially_refunded"] as const).map((s) => ({ value: s, label: t.common.paymentStatus[s] })),
          },
        ]}
        actions={[
          { label: t.admin.orders.number, icon: <Eye />, onClick: (r) => router.push(`/admin/orders/${r.orderId}`) },
          {
            label: p.refund,
            icon: <Undo2 />,
            hidden: (r) => !can("payments.refund") || r.refunded >= r.amount || r.status === "failed" || r.status === "pending",
            onClick: (r) => {
              setRefunding(r);
              setAmount(r.amount - r.refunded);
              setReason("");
            },
          },
        ]}
      />

      <Dialog open={!!refunding} onOpenChange={(o) => !o && setRefunding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{p.refundTitle}</DialogTitle>
            <DialogDescription>
              {refunding?.orderNumber} · {refunding && methodLabel(refunding.method)} · {refunding?.payerPhone ?? (refunding?.cardLast4 && `•••• ${refunding.cardLast4}`)}
            </DialogDescription>
          </DialogHeader>
          {refunding && (
            <form
              className="grid gap-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const max = refunding.amount - refunding.refunded;
                if (amount <= 0 || amount > max) return toast.error(fmt(p.refundMax, { amount: formatTZS(max) }));
                setBusy(true);
                try {
                  await refundPayment(refunding.id, amount, reason || "—");
                  setRefunding(null);
                  refresh();
                  toast.success(p.refundDone);
                } catch (err) {
                  toast.error(apiErrorMessage(err, t));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Field label={p.refundAmount} htmlFor="rf-amount" hint={fmt(p.refundMax, { amount: formatTZS(refunding.amount - refunding.refunded) })}>
                <Input id="rf-amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              </Field>
              <Field label={p.refundReason} htmlFor="rf-reason">
                <Textarea id="rf-reason" className="min-h-20" value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
              <Button type="submit" variant="destructive" loading={busy}>
                {p.refund} {formatTZS(amount)}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </RequirePermission>
  );
}
