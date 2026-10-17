"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Download, Inbox, MoreHorizontal, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ListParams, Paginated } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, NativeSelect } from "@/components/ui/form-controls";
import { Pagination } from "@/components/ui/feedback";
import { ConfirmDialog, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/overlays";
import { useT } from "@/lib/i18n/client";
import { cn, fmt } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api/errors";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** Field to sort by (server-side sort key). */
  sort?: string;
  className?: string;
  /** Plain value for CSV export. */
  csv?: (row: T) => string | number;
}

export interface FilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface RowAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  destructive?: boolean;
  hidden?: (row: T) => boolean;
}

/** Holds list params (page, search, sort, filters) for a table. */
export function useTableState(initial: ListParams = {}) {
  const [params, setParams] = useState<ListParams>({ page: 1, perPage: 10, ...initial });
  return {
    params,
    setSearch: (search: string) => setParams((p) => ({ ...p, search, page: 1 })),
    setFilter: (key: string, value: string) => setParams((p) => ({ ...p, page: 1, filters: { ...p.filters, [key]: value } })),
    setSort: (sort: string) => setParams((p) => ({ ...p, sort })),
    setPage: (page: number) => setParams((p) => ({ ...p, page })),
    setPerPage: (perPage: number) => setParams((p) => ({ ...p, perPage, page: 1 })),
  };
}

export function DataTable<T extends { id: string }>({
  data,
  loading,
  columns,
  state,
  filters,
  actions,
  onRowClick,
  onDelete,
  exportName,
  toolbar,
  searchable = true,
}: {
  data?: Paginated<T>;
  loading?: boolean;
  columns: Column<T>[];
  state: ReturnType<typeof useTableState>;
  filters?: FilterDef[];
  actions?: RowAction<T>[];
  onRowClick?: (row: T) => void;
  onDelete?: (ids: string[]) => Promise<void> | void;
  exportName?: string;
  toolbar?: React.ReactNode;
  searchable?: boolean;
}) {
  const { t } = useT();
  const tt = t.admin.table;
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [search, setSearch] = useState(state.params.search ?? "");
  const rows = data?.data ?? [];
  const meta = data?.meta;
  const allChecked = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  const sortIcon = (field?: string) => {
    if (!field) return null;
    if (state.params.sort === field) return <ArrowUp className="size-3" />;
    if (state.params.sort === `-${field}`) return <ArrowDown className="size-3" />;
    return <ArrowUpDown className="size-3 opacity-40" />;
  };

  const exportCsv = () => {
    const cols = columns.filter((c) => c.csv);
    const lines = [cols.map((c) => (typeof c.header === "string" ? c.header : c.key)).join(","), ...rows.map((r) => cols.map((c) => `"${String(c.csv!(r)).replace(/"/g, '""')}"`).join(","))];
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${exportName ?? "export"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="overflow-hidden rounded-[20px] border border-border bg-card shadow-soft">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3 sm:p-4">
        {searchable && (
          <form
            className="relative w-full sm:w-72"
            onSubmit={(e) => {
              e.preventDefault();
              state.setSearch(search);
            }}
          >
            <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (!e.target.value) state.setSearch("");
              }}
              onBlur={() => state.setSearch(search)}
              placeholder={tt.search}
              className="h-10 pl-10"
            />
          </form>
        )}
        {filters?.map((f) => (
          <NativeSelect
            key={f.key}
            aria-label={f.label}
            value={state.params.filters?.[f.key] ?? "all"}
            onChange={(e) => state.setFilter(f.key, e.target.value)}
            className="h-10 w-auto min-w-36 text-sm"
          >
            <option value="all">
              {f.label}: {tt.all}
            </option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {selected.length > 0 && onDelete && (
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setConfirm(selected)}>
              <Trash2 />
              {tt.deleteSelected} ({selected.length})
            </Button>
          )}
          {toolbar}
          {exportName && (
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
              <Download />
              {tt.exportCsv}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
              {onDelete && (
                <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={allChecked ? true : selected.length ? "indeterminate" : false}
                    onCheckedChange={(c) => setSelected(c ? rows.map((r) => r.id) : [])}
                    aria-label="Select all"
                  />
                </th>
              )}
              {columns.map((c) => (
                <th key={c.key} className={cn("px-4 py-3 font-medium whitespace-nowrap", c.className)}>
                  {c.sort ? (
                    <button
                      className="inline-flex items-center gap-1.5 hover:text-foreground"
                      onClick={() => state.setSort(state.params.sort === `-${c.sort}` ? c.sort! : `-${c.sort}`)}
                    >
                      {c.header}
                      {sortIcon(c.sort)}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
              {actions && <th className="w-12 px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && !rows.length
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: columns.length + (onDelete ? 1 : 0) + (actions ? 1 : 0) }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="skeleton h-4 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn("transition-colors hover:bg-muted/40", onRowClick && "cursor-pointer", selected.includes(row.id) && "bg-primary-soft/30")}
                  >
                    {onDelete && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.includes(row.id)}
                          onCheckedChange={(c) => setSelected((s) => (c ? [...s, row.id] : s.filter((x) => x !== row.id)))}
                          aria-label="Select row"
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td key={c.key} className={cn("px-4 py-3", c.className)}>
                        {c.cell(row)}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="rounded-lg p-1.5 text-muted-foreground outline-none hover:bg-accent hover:text-foreground" aria-label={t.admin.common.actions}>
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {actions
                              .filter((a) => !a.hidden?.(row))
                              .map((a) => (
                                <DropdownMenuItem key={a.label} destructive={a.destructive} onSelect={() => a.onClick(row)}>
                                  {a.icon}
                                  {a.label}
                                </DropdownMenuItem>
                              ))}
                            {onDelete && (
                              <DropdownMenuItem destructive onSelect={() => setConfirm([row.id])}>
                                <Trash2 />
                                {t.admin.common.delete}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <Inbox className="size-10 text-muted-foreground/50" />
            <p className="mt-3 font-medium">{tt.noData}</p>
            <p className="text-sm text-muted-foreground">{tt.noDataDesc}</p>
          </div>
        )}
      </div>

      {meta && meta.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>{fmt(tt.showing, { from: meta.from ?? 0, to: meta.to ?? 0, total: meta.total })}</span>
            <NativeSelect aria-label={tt.rows} value={String(meta.per_page)} onChange={(e) => state.setPerPage(Number(e.target.value))} className="h-8 w-20 text-xs">
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Pagination page={meta.current_page} lastPage={meta.last_page} onPageChange={state.setPage} />
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm && confirm.length > 1 ? fmt(t.admin.common.confirmDeleteMany, { n: confirm.length }) : t.admin.common.confirmDelete}
        description={t.admin.common.confirmDeleteDesc}
        confirmLabel={t.admin.common.delete}
        cancelLabel={t.admin.common.cancel}
        onConfirm={async () => {
          try {
            await onDelete?.(confirm!);
            setSelected((s) => s.filter((id) => !confirm!.includes(id)));
            toast.success(t.admin.common.deleted);
          } catch (err) {
            toast.error(apiErrorMessage(err, t));
          }
        }}
      />
    </div>
  );
}
