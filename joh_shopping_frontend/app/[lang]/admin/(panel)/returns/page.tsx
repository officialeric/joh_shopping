"use client";

import { Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ReturnRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/form-controls";
import { Link } from "@/components/ui/link";
import { Badge } from "@/components/ui/primitives";
import { Sheet, SheetContent } from "@/components/ui/overlays";
import { AdminPageHeader, RequirePermission } from "@/components/admin/admin-shell";
import { DataTable, useTableState, type Column } from "@/components/admin/data-table";
import { ReturnStatusBadge } from "@/components/admin/widgets";
import { updateReturn } from "@/lib/api/admin";
import { useAdminList, useInvalidateAdmin } from "@/lib/api/hooks";
import { useT } from "@/lib/i18n/client";
import { formatDate, formatDateTime, formatTZS } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api/errors";

const STATUSES: ReturnRequest["status"][] = ["requested", "approved", "received", "repaired", "refunded", "rejected", "completed"];

export default function AdminReturnsPage() {
  const { t, locale } = useT();
  const r = t.admin.returns;
  const refresh = useInvalidateAdmin();
  const state = useTableState({ sort: "-createdAt" });
  const { data, isLoading } = useAdminList("returns", state.params);
  const [open, setOpen] = useState<ReturnRequest | null>(null);
  const [status, setStatus] = useState<ReturnRequest["status"]>("requested");
  const [resolution, setResolution] = useState<NonNullable<ReturnRequest["resolution"]>>("refund");
  const [refundAmount, setRefundAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const show = (row: ReturnRequest) => {
    setOpen(row);
    setStatus(row.status);
    setResolution(row.resolution ?? "refund");
    setRefundAmount(row.suggestedRefund ? String(row.suggestedRefund) : "");
  };
  // Marking a return refunded refunds the payment once; the amount is asked for only then.
  const asksRefund = !!open && status === "refunded" && open.status !== "refunded" && open.refundAmount === undefined;

  const columns: Column<ReturnRequest>[] = [
    {
      key: "number",
      header: r.number,
      sort: "number",
      cell: (x) => (
        <div>
          <p className="font-medium">{x.number}</p>
          <p className="text-xs text-muted-foreground">{formatDate(x.createdAt, locale)}</p>
        </div>
      ),
      csv: (x) => x.number,
    },
    { key: "type", header: r.type, cell: (x) => <Badge variant={x.type === "warranty" ? "info" : "outline"}>{x.type === "warranty" ? r.warranty : r.return}</Badge>, csv: (x) => x.type },
    {
      key: "product",
      header: t.admin.common.product,
      cell: (x) => (
        <div className="max-w-xs">
          <p className="truncate">{x.productName}</p>
          {x.imei && <p className="font-mono text-xs text-muted-foreground">IMEI {x.imei}</p>}
        </div>
      ),
      csv: (x) => x.productName,
    },
    { key: "customer", header: t.admin.common.customer, sort: "customerName", cell: (x) => x.customerName, csv: (x) => x.customerName },
    { key: "reason", header: r.reason, cell: (x) => <span className="text-xs">{x.reason}</span>, csv: (x) => x.reason },
    { key: "status", header: t.admin.common.status, cell: (x) => <ReturnStatusBadge status={x.status} />, csv: (x) => x.status },
  ];

  return (
    <RequirePermission perm="returns.manage">
      <AdminPageHeader title={r.title} subtitle={r.subtitle} />
      <DataTable
        data={data}
        loading={isLoading}
        columns={columns}
        state={state}
        exportName="returns"
        onRowClick={show}
        filters={[
          { key: "type", label: r.type, options: [{ value: "return", label: r.return }, { value: "warranty", label: r.warranty }] },
          { key: "status", label: t.admin.common.status, options: STATUSES.map((s) => ({ value: s, label: t.common.returnStatus[s] })) },
        ]}
        actions={[{ label: t.admin.common.view, icon: <Eye />, onClick: show }]}
      />

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent heading={open?.number ?? ""} description={open && (open.type === "warranty" ? r.warranty : r.return)}>
          {open && (
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="flex items-center gap-2">
                <ReturnStatusBadge status={open.status} />
                <span className="text-xs text-muted-foreground">{formatDateTime(open.updatedAt, locale)}</span>
              </div>
              <dl className="space-y-3 text-sm">
                {[
                  [t.admin.common.customer, open.customerName],
                  [t.admin.orders.number, <Link key="o" href={`/admin/orders/${open.orderId}`} className="text-primary hover:underline">{open.orderNumber}</Link>],
                  [t.admin.common.product, open.productName],
                  ["IMEI", open.imei ?? "—"],
                  [r.reason, open.reason],
                  ...(open.refundAmount !== undefined ? [[r.refundedAmount, formatTZS(open.refundAmount)]] : []),
                ].map(([k, v], i) => (
                  <div key={i} className="grid grid-cols-[110px_1fr] gap-3">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="rounded-xl bg-muted p-4 text-sm">{open.details}</p>
              <div className="space-y-3 border-t border-border pt-5">
                <Field label={r.updateStatus} htmlFor="rt-status">
                  <NativeSelect id="rt-status" value={status} onChange={(e) => setStatus(e.target.value as ReturnRequest["status"])}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t.common.returnStatus[s]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label={r.resolution} htmlFor="rt-res">
                  <NativeSelect id="rt-res" value={resolution} onChange={(e) => setResolution(e.target.value as NonNullable<ReturnRequest["resolution"]>)}>
                    {(Object.keys(r.resolutions) as NonNullable<ReturnRequest["resolution"]>[]).map((k) => (
                      <option key={k} value={k}>
                        {r.resolutions[k]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                {asksRefund && (
                  <Field label={r.refundAmount} htmlFor="rt-refund" hint={r.refundHint.replace("{amount}", formatTZS(open.refundable ?? 0))}>
                    <Input id="rt-refund" type="number" inputMode="numeric" min={1} max={open.refundable} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
                  </Field>
                )}
                <Button
                  className="w-full"
                  loading={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const updated = await updateReturn(open.id, {
                        status,
                        resolution,
                        ...(asksRefund && refundAmount ? { refundAmount: Number(refundAmount) } : {}),
                      });
                      setOpen({ ...updated });
                      refresh();
                      toast.success(r.updated);
                    } catch (err) {
                      toast.error(apiErrorMessage(err, t));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {t.admin.common.save}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </RequirePermission>
  );
}
