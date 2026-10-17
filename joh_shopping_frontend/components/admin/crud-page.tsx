"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import type { ListParams, Permission } from "@/types";
import { Button } from "@/components/ui/button";
import type { CollectionKey, Item } from "@/lib/api/core";
import { useAdminDelete, useAdminList, useAdminSave } from "@/lib/api/hooks";
import { useT } from "@/lib/i18n/client";
import { AdminPageHeader, RequirePermission, useAdmin } from "./admin-shell";
import { DataTable, useTableState, type Column, type FilterDef, type RowAction } from "./data-table";
import { FormDialog, type FieldDef } from "./form-dialog";

/**
 * Standard admin CRUD screen: header + searchable table + create/edit dialog.
 * Each module only declares columns, form fields and a blank record.
 */
export function CrudPage<K extends CollectionKey>({
  collection,
  perm,
  title,
  subtitle,
  newLabel,
  editLabel,
  columns,
  fields,
  blank,
  filters,
  actions,
  initialParams,
  beforeSave,
  exportName,
  headerExtra,
  wideForm,
  canCreate = true,
  embedded,
}: {
  collection: K;
  perm: Permission;
  title: string;
  subtitle: string;
  newLabel?: string;
  editLabel: string;
  columns: Column<Item<K>>[];
  fields: FieldDef[];
  blank: () => Omit<Item<K>, "id">;
  filters?: FilterDef[];
  actions?: RowAction<Item<K>>[];
  initialParams?: ListParams;
  beforeSave?: (row: Item<K>) => Item<K>;
  exportName?: string;
  headerExtra?: React.ReactNode;
  wideForm?: boolean;
  canCreate?: boolean;
  /** Render inside another page with a smaller heading. */
  embedded?: boolean;
}) {
  const { t } = useT();
  const { can } = useAdmin();
  const state = useTableState(initialParams);
  const { data, isLoading } = useAdminList(collection, state.params);
  const save = useAdminSave(collection);
  const del = useAdminDelete(collection);
  const [editing, setEditing] = useState<Item<K> | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing(blank() as Item<K>);
    setOpen(true);
  };
  const openEdit = (row: Item<K>) => {
    setEditing(structuredClone(row));
    setOpen(true);
  };

  return (
    <RequirePermission perm={perm}>
      <AdminPageHeader
        className={embedded ? "mb-4 [&_h1]:text-lg" : undefined}
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {headerExtra}
            {canCreate && newLabel && can(perm) && (
              <Button onClick={openNew}>
                <Plus />
                {newLabel}
              </Button>
            )}
          </>
        }
      />
      <DataTable
        data={data}
        loading={isLoading}
        columns={columns}
        state={state}
        filters={filters}
        exportName={exportName}
        onRowClick={openEdit}
        onDelete={(ids) => del.mutateAsync(ids)}
        actions={[{ label: t.admin.common.edit, icon: <Pencil />, onClick: openEdit }, ...(actions ?? [])]}
      />
      {editing && (
        <FormDialog
          open={open}
          onOpenChange={setOpen}
          title={(editing as { id?: string }).id ? editLabel : newLabel ?? editLabel}
          fields={fields}
          initial={editing}
          wide={wideForm}
          onSubmit={(values) => save.mutateAsync(beforeSave ? beforeSave(values) : values)}
        />
      )}
    </RequirePermission>
  );
}
