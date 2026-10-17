"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import type * as React from "react";
import { useLocalizePath } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<typeof NextLink>, "href"> & { href: string };

/** next/link that keeps the visitor's language in the URL. */
export function Link({ href, ...props }: Props) {
  const localize = useLocalizePath();
  return <NextLink href={localize(href)} {...props} />;
}

type NavLinkProps = Props & { activeClassName?: string; exact?: boolean };

/**
 * Link that styles itself when its route is active. Reading the pathname is
 * request-time data, so it sits in its own Suspense boundary and renders as a
 * plain link in the prerendered shell.
 */
export function NavLink({ activeClassName, exact, ...props }: NavLinkProps) {
  return (
    <Suspense fallback={<Link {...props} />}>
      <ActiveLink activeClassName={activeClassName} exact={exact} {...props} />
    </Suspense>
  );
}

function ActiveLink({ href, className, activeClassName, exact, ...props }: NavLinkProps) {
  const localize = useLocalizePath();
  const pathname = usePathname();
  const target = localize(href);
  const active = exact ? pathname === target : pathname === target || pathname.startsWith(`${target}/`);
  return (
    <NextLink
      href={target}
      aria-current={active ? "page" : undefined}
      className={cn(className, active && activeClassName)}
      {...props}
    />
  );
}
