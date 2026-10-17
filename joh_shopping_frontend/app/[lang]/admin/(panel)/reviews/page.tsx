"use client";

import { BadgeCheck, Check, EyeOff, MessageSquareReply } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Review } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-controls";
import { Pagination } from "@/components/ui/feedback";
import { Badge, Rating, Skeleton, Tabs, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { AdminPageHeader, RequirePermission } from "@/components/admin/admin-shell";
import { useTableState } from "@/components/admin/data-table";
import { ProductThumb } from "@/components/admin/widgets";
import { moderateReview } from "@/lib/api/admin";
import { useAdminList, useInvalidateAdmin } from "@/lib/api/hooks";
import { useAdminProductLookup } from "@/lib/api/hooks";
import { useT } from "@/lib/i18n/client";
import { formatDate } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api/errors";

export default function AdminReviewsPage() {
  const { t, locale } = useT();
  const r = t.admin.reviews;
  const refresh = useInvalidateAdmin();
  const state = useTableState({ sort: "-createdAt", filters: { status: "pending" } });
  const { data, isLoading } = useAdminList("reviews", state.params);
  const [replying, setReplying] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const status = state.params.filters?.status ?? "all";

  const productById = useAdminProductLookup();
  const act = async (rev: Review, patch: Parameters<typeof moderateReview>[1], msg: string) => {
    try {
      await moderateReview(rev.id, patch);
    } catch (err) {
      toast.error(apiErrorMessage(err, t));
      return;
    }
    refresh();
    toast.success(msg);
  };

  return (
    <RequirePermission perm="reviews.manage">
      <AdminPageHeader title={r.title} subtitle={r.subtitle} />
      <Tabs value={status} onValueChange={(v) => state.setFilter("status", v)} className="mb-5">
        <TabsList>
          <TabsTrigger value="pending">{r.status.pending}</TabsTrigger>
          <TabsTrigger value="approved">{r.status.approved}</TabsTrigger>
          <TabsTrigger value="hidden">{r.status.hidden}</TabsTrigger>
          <TabsTrigger value="all">{t.admin.table.all}</TabsTrigger>
        </TabsList>
      </Tabs>
      {isLoading ? (
        <Skeleton className="h-96" />
      ) : !data?.data.length ? (
        <p className="rounded-[20px] border border-dashed border-border bg-card py-16 text-center text-muted-foreground">{t.admin.table.noData}</p>
      ) : (
        <div className="space-y-3">
          {data.data.map((rev) => {
            const product = productById(rev.productId);
            return (
              <article key={rev.id} className="rounded-[20px] border border-border bg-card p-5 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ProductThumb productId={rev.productId} />
                    <div>
                      <p className="text-sm font-medium">{product?.name}</p>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {rev.customerName} · {formatDate(rev.createdAt, locale)}
                        {rev.verified && (
                          <span className="inline-flex items-center gap-0.5 text-success">
                            <BadgeCheck className="size-3.5" />
                            {r.verified}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge variant={rev.status === "approved" ? "success" : rev.status === "pending" ? "warning" : "muted"}>{r.status[rev.status]}</Badge>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Rating value={rev.rating} />
                  <span className="text-sm font-semibold">{rev.title}</span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{rev.body}</p>
                {rev.reply && replying !== rev.id && <p className="mt-3 rounded-xl border-l-2 border-primary bg-muted p-3 text-sm">{rev.reply}</p>}
                {replying === rev.id && (
                  <div className="mt-3 space-y-2">
                    <Textarea className="min-h-20" placeholder={r.replyPlaceholder} value={reply} onChange={(e) => setReply(e.target.value)} />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          await act(rev, { reply }, r.replied);
                          setReplying(null);
                        }}
                      >
                        {t.admin.common.save}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setReplying(null)}>
                        {t.admin.common.cancel}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  {rev.status !== "approved" && (
                    <Button size="sm" onClick={() => act(rev, { status: "approved" }, r.approved)}>
                      <Check />
                      {t.common.actions.approve}
                    </Button>
                  )}
                  {rev.status !== "hidden" && (
                    <Button size="sm" variant="outline" onClick={() => act(rev, { status: "hidden" }, r.hidden)}>
                      <EyeOff />
                      {t.common.actions.hide}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setReplying(rev.id);
                      setReply(rev.reply ?? "");
                    }}
                  >
                    <MessageSquareReply />
                    {r.reply}
                  </Button>
                </div>
              </article>
            );
          })}
          <Pagination page={data.meta.current_page} lastPage={data.meta.last_page} onPageChange={state.setPage} className="pt-4" />
        </div>
      )}
    </RequirePermission>
  );
}
