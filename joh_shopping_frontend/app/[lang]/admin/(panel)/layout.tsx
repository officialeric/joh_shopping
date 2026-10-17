import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: { default: t.admin.panel, template: `%s · Admin` }, robots: { index: false, follow: false } };
}

export default function AdminPanelLayout({ children }: LayoutProps<"/[lang]/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
