"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/primitives";
import { RequirePermission } from "@/components/admin/admin-shell";
import { ProductEditor } from "@/components/admin/product-editor";
import { useAdminRecord } from "@/lib/api/hooks";

function Editor() {
  const { id } = useParams<{ id: string }>();
  const { data } = useAdminRecord("products", id);
  if (!data) return <Skeleton className="h-[600px]" />;
  return <ProductEditor key={data.id} initial={data} />;
}

export default function EditProductPage() {
  return (
    <RequirePermission perm="products.manage">
      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <Editor />
      </Suspense>
    </RequirePermission>
  );
}
