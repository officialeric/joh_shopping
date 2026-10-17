import type { Metadata } from "next";
import { Suspense } from "react";
import { StaffSetPassword } from "@/components/admin/staff-password";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.admin.login.resetTitle, robots: { index: false } };
}

export default function Page() {
  return (
    <Suspense>
      <StaffSetPassword />
    </Suspense>
  );
}
