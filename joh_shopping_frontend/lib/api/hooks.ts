"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { ListParams, Product } from "@/types";
import { useShop } from "@/lib/data/shop-context";
import { all, create, find, list, remove, update, type CollectionKey, type Item } from "./core";

/** Paginated admin listing, Laravel-style ({ data, meta }). */
export function useAdminList<K extends CollectionKey>(key: K, params: ListParams) {
  return useQuery({
    queryKey: ["admin", key, params],
    queryFn: () => list(key, params),
    placeholderData: keepPreviousData,
  });
}

/** Every row of a collection (selects, lookups). Filters use the API's filter[] keys. */
export function useAdminAll<K extends CollectionKey>(key: K, filters: Record<string, string> = {}) {
  return useQuery({ queryKey: ["admin", key, "all", filters], queryFn: () => all(key, filters), staleTime: 60_000 });
}

export function useAdminRecord<K extends CollectionKey>(key: K, id: string | undefined) {
  return useQuery({ queryKey: ["admin", key, "one", id], queryFn: () => find(key, id!), enabled: !!id });
}

/** Create or update a record (the server writes the activity log), then refresh that collection. */
export function useAdminSave<K extends CollectionKey>(key: K) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: Item<K> | (Omit<Item<K>, "id"> & { id?: string })) =>
      row.id ? update(key, row.id, row as Partial<Item<K>>) : create(key, row as Omit<Item<K>, "id">),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", key] }),
  });
}

export function useAdminPatch<K extends CollectionKey>(key: K) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Item<K>> }) => update(key, id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", key] }),
  });
}

export function useAdminDelete<K extends CollectionKey>(key: K) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => remove(key, ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", key] }),
  });
}

/** Refresh everything admin-related after a cross-collection operation. */
export function useInvalidateAdmin() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["admin"] });
}

/** Product by id for admin screens: every product incl. drafts, falling back to the storefront catalog. */
export function useAdminProductLookup() {
  const { data } = useAdminAll("products");
  const { getProduct } = useShop();
  const byId = useMemo(() => new Map((data ?? []).map((p) => [p.id, p])), [data]);
  return useCallback((id: string): Product | undefined => byId.get(id) ?? getProduct(id), [byId, getProduct]);
}
