import type { Metadata } from "next";
import { StaffForgotPassword } from "@/components/admin/staff-password";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.admin.login.forgotTitle, robots: { index: false } };
}

export default function Page() {
  return <StaffForgotPassword />;
}
