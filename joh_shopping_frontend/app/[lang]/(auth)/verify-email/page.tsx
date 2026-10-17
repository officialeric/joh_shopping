import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmail } from "@/components/auth/auth-forms";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.auth.verify.title, robots: { index: false } };
}

export default function Page() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}
