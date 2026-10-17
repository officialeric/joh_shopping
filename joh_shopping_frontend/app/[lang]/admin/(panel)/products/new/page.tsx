"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/primitives";
import { RequirePermission } from "@/components/admin/admin-shell";
import { ProductEditor, blankProduct } from "@/components/admin/product-editor";
import { useMounted } from "@/lib/hooks";

function NewProductEditor() {
  // A new product gets a fresh id and timestamp, so it's created on the client.
  const [initial] = useState(blankProduct);
  return <ProductEditor initial={initial} isNew />;
}

export default function NewProductPage() {
  const mounted = useMounted();
  return <RequirePermission perm="products.manage">{mounted ? <NewProductEditor /> : <Skeleton className="h-[600px]" />}</RequirePermission>;
}
