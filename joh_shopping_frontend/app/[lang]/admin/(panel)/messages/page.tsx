"use client";

import { Archive, Inbox, Mail, Phone, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ContactMessage } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-controls";
import { Avatar, Badge, Skeleton, Tabs, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { AdminPageHeader, RequirePermission } from "@/components/admin/admin-shell";
import { useTableState } from "@/components/admin/data-table";
import { replyMessage } from "@/lib/api/admin";
import { useAdminList, useAdminPatch, useInvalidateAdmin } from "@/lib/api/hooks";
import { useT } from "@/lib/i18n/client";
import { cn, formatDateTime } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api/errors";

export default function AdminMessagesPage() {
  const { t, locale } = useT();
  const m = t.admin.messages;
  const refresh = useInvalidateAdmin();
  const patch = useAdminPatch("messages");
  const state = useTableState({ sort: "-createdAt", perPage: 50 });
  const { data, isLoading } = useAdminList("messages", state.params);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const list = data?.data ?? [];
  const selected = list.find((x) => x.id === selectedId) ?? list[0];
  const tab = state.params.filters?.status ?? "all";

  const open = (msg: ContactMessage) => {
    setSelectedId(msg.id);
    setReply("");
    if (msg.status === "new") patch.mutate({ id: msg.id, patch: { status: "read" } });
  };

  const variant = (s: ContactMessage["status"]) => (s === "new" ? "danger" : s === "replied" ? "success" : s === "archived" ? "muted" : "outline");

  return (
    <RequirePermission perm="messages.manage">
      <AdminPageHeader title={m.title} subtitle={m.subtitle} />
      <Tabs value={tab} onValueChange={(v) => state.setFilter("status", v)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">{t.admin.table.all}</TabsTrigger>
          {(Object.keys(m.status) as ContactMessage["status"][]).map((s) => (
            <TabsTrigger key={s} value={s}>
              {m.status[s]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {isLoading ? (
        <Skeleton className="h-[520px]" />
      ) : (
        <div className="grid min-h-[520px] overflow-hidden rounded-[20px] border border-border bg-card shadow-soft lg:grid-cols-[360px_1fr]">
          <ul className="max-h-[640px] divide-y divide-border overflow-y-auto border-b border-border lg:border-r lg:border-b-0">
            {list.length === 0 && (
              <li className="flex flex-col items-center py-16 text-muted-foreground">
                <Inbox className="size-8" />
                <span className="mt-2 text-sm">{t.admin.table.noData}</span>
              </li>
            )}
            {list.map((msg) => (
              <li key={msg.id}>
                <button
                  onClick={() => open(msg)}
                  className={cn("flex w-full gap-3 p-4 text-left transition hover:bg-muted/50", selected?.id === msg.id && "bg-primary-soft/40")}
                >
                  <Avatar name={msg.name} className="size-9 text-[11px]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("truncate text-sm", msg.status === "new" ? "font-semibold" : "font-medium")}>{msg.name}</p>
                      {msg.status === "new" && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                    <p className="truncate text-sm">{msg.subject}</p>
                    <p className="truncate text-xs text-muted-foreground">{msg.message}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {selected ? (
            <div className="flex flex-col p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h2 className="text-lg font-semibold">{selected.subject}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {m.from} <span className="font-medium text-foreground">{selected.name}</span> · {formatDateTime(selected.createdAt, locale)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <a href={`mailto:${selected.email}`} className="flex items-center gap-1 hover:text-primary">
                      <Mail className="size-3.5" />
                      {selected.email}
                    </a>
                    {selected.phone && (
                      <a href={`tel:${selected.phone}`} className="flex items-center gap-1 hover:text-primary">
                        <Phone className="size-3.5" />
                        {selected.phone}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={variant(selected.status)}>{m.status[selected.status]}</Badge>
                  {selected.status !== "archived" && (
                    <Button size="sm" variant="outline" onClick={() => patch.mutate({ id: selected.id, patch: { status: "archived" } })}>
                      <Archive />
                      {m.archive}
                    </Button>
                  )}
                </div>
              </div>
              <p className="flex-1 py-6 text-[15px] leading-relaxed whitespace-pre-line">{selected.message}</p>
              <form
                className="space-y-2 border-t border-border pt-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!reply.trim()) return;
                  setBusy(true);
                  try {
                    await replyMessage(selected.id, reply);
                    setReply("");
                    refresh();
                    toast.success(m.sent);
                  } catch (err) {
                    toast.error(apiErrorMessage(err, t));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Textarea placeholder={m.replyPlaceholder} value={reply} onChange={(e) => setReply(e.target.value)} />
                <div className="flex justify-end">
                  <Button type="submit" loading={busy} disabled={!reply.trim()}>
                    <Send />
                    {m.reply}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="hidden items-center justify-center text-muted-foreground lg:flex">
              <Inbox className="size-10" />
            </div>
          )}
        </div>
      )}
    </RequirePermission>
  );
}
