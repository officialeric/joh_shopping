"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Package, ShieldAlert, Tag, TrendingDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Link } from "@/components/ui/link";
import { Skeleton, Tabs, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { AccountHeader, useAccountUser } from "@/components/account/account-shell";
import { markNotificationsRead, myNotifications } from "@/lib/api/shop";
import { useT } from "@/lib/i18n/client";
import { cn, formatDateTime } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api/errors";
import { toast } from "sonner";

const icons = { order: Package, promo: Tag, stock: TrendingDown, account: ShieldAlert };

export default function NotificationsPage() {
  const { t, locale } = useT();
  const n = t.account.notifications;
  const user = useAccountUser();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const { data, isLoading } = useQuery({ queryKey: ["notifications", user.id], queryFn: () => myNotifications() });
  const list = (data ?? []).filter((x) => tab === "all" || !x.read);
  const markAll = async () => {
    await markNotificationsRead().catch((err) => toast.error(apiErrorMessage(err, t)));
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  return (
    <>
      <AccountHeader
        title={n.title}
        subtitle={n.subtitle}
        action={
          <Button variant="outline" onClick={markAll}>
            <CheckCheck />
            {t.common.actions.markAllRead}
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "unread")} className="mb-5">
        <TabsList>
          <TabsTrigger value="all">{n.all}</TabsTrigger>
          <TabsTrigger value="unread">
            {n.unread}
            <span className="rounded-full bg-primary px-1.5 text-[10px] text-white">{data?.filter((x) => !x.read).length ?? 0}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {isLoading ? (
        <Skeleton className="h-80" />
      ) : list.length === 0 ? (
        <EmptyState icon={<Bell />} title={n.empty} className="rounded-[24px] border border-dashed border-border" />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-[24px] border border-border bg-card">
          {list.map((item) => {
            const Icon = icons[item.type];
            const body = (
              <div className={cn("flex gap-4 p-5 transition hover:bg-accent/50", !item.read && "bg-primary-soft/30")}>
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", item.read ? "bg-muted text-muted-foreground" : "bg-primary text-white")}>
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{item.title[locale]}</p>
                    {!item.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.body[locale]}</p>
                  <p className="mt-1 text-xs text-muted-foreground/80">{formatDateTime(item.createdAt, locale)}</p>
                </div>
              </div>
            );
            return (
              <li key={item.id} onClick={() => !item.read && markNotificationsRead([item.id]).then(() => qc.invalidateQueries({ queryKey: ["notifications", user.id] }))}>
                {item.href ? <Link href={item.href}>{body}</Link> : body}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
