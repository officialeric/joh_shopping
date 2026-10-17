import type { Metadata } from "next";
import { AccountShell } from "@/components/account/account-shell";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: { default: t.common.nav.account, template: `%s | ${t.common.nav.account}` }, robots: { index: false } };
}

export default function AccountLayout({ children }: LayoutProps<"/[lang]/account">) {
  return <AccountShell>{children}</AccountShell>;
}
