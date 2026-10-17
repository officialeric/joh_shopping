"use client";

import { ArrowLeft, Ban, Mail, MapPin, Phone, Receipt, ShoppingBag, UserCheck, Wallet } from "lucide-react";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Avatar, Badge, Skeleton } from "@/components/ui/primitives";
import { OrderStatusBadge } from "@/components/shop/order-timeline";
import { RequirePermission } from "@/components/admin/admin-shell";
import { MethodCell, Panel, StatCard } from "@/components/admin/widgets";
import { useAdminAll, useAdminPatch, useAdminRecord } from "@/lib/api/hooks";
import { apiErrorMessage } from "@/lib/api/errors";
import { useT } from "@/lib/i18n/client";
import { formatDate, formatTZS } from "@/lib/utils";

function CustomerDetail() {
  const { t, locale } = useT();
  const c = t.admin.customers;
  const { id } = useParams<{ id: string }>();
  const { data: customer, isLoading } = useAdminRecord("customers", id);
  const patch = useAdminPatch("customers");
  const { data: orders = [] } = useAdminAll("orders", { customerId: id });
  if (isLoading || !customer) return <Skeleton className="h-[600px]" />;

  const addresses = customer.addresses ?? [];
  const valid = orders.filter((o) => o.status !== "cancelled");
  const spent = valid.reduce((s, o) => s + o.total, 0);
  const blocked = customer.status === "blocked";

  return (
    <div className="space-y-6">
      <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {c.title}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-4">
          <Avatar name={customer.name} className="size-16 text-lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{customer.name}</h1>
              {blocked ? <Badge variant="danger">{c.blocked}</Badge> : <Badge variant="success">{t.admin.common.active}</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Mail className="size-4" />
                {customer.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="size-4" />
                {customer.phone}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {customer.region}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {c.joined} {formatDate(customer.createdAt, locale)} · {c.newsletter}: {customer.newsletter ? t.admin.common.yes : t.admin.common.no}
            </p>
          </div>
        </div>
        <Button
          variant={blocked ? "outline" : "destructive"}
          onClick={() => {
            patch.mutate(
              { id: customer.id, patch: { status: blocked ? "active" : "blocked" } },
              {
                onSuccess: () => toast.success(blocked ? c.unblockedToast : c.blockedToast),
                onError: (err) => toast.error(apiErrorMessage(err, t)),
              },
            );
          }}
        >
          {blocked ? <UserCheck /> : <Ban />}
          {blocked ? c.unblock : c.block}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard tone="brand" label={c.lifetime} value={formatTZS(spent, { compact: true })} icon={Wallet} />
        <StatCard label={c.orders} value={orders.length} icon={ShoppingBag} />
        <StatCard label={c.avgOrder} value={formatTZS(valid.length ? spent / valid.length : 0, { compact: true })} icon={Receipt} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title={c.orderHistory}>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.admin.table.noData}</p>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/40">
                      <td className="px-2 py-3">
                        <Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-primary">
                          {o.number}
                        </Link>
                        <p className="text-xs text-muted-foreground">{formatDate(o.createdAt, locale)}</p>
                      </td>
                      <td className="px-2 py-3 text-xs text-muted-foreground">{o.items.map((i) => i.name).join(", ")}</td>
                      <td className="px-2 py-3">
                        <MethodCell method={o.paymentMethod} />
                      </td>
                      <td className="px-2 py-3">
                        <OrderStatusBadge status={o.status} />
                      </td>
                      <td className="px-2 py-3 text-right font-medium tabular-nums">{formatTZS(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel title={c.addresses}>
          {addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <ul className="space-y-3">
              {addresses.map((a) => (
                <li key={a.id} className="rounded-xl border border-border p-3 text-sm">
                  <p className="font-medium">
                    {a.label} {a.isDefault && <Badge variant="soft">{t.account.addresses.default}</Badge>}
                  </p>
                  <p className="text-muted-foreground">
                    {a.street}, {a.district}, {a.region}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

export default function AdminCustomerPage() {
  return (
    <RequirePermission perm="customers.manage">
      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <CustomerDetail />
      </Suspense>
    </RequirePermission>
  );
}
