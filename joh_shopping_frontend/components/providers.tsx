"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { persistedStores, useUI } from "@/stores";
import { TooltipProvider } from "@/components/ui/overlays";
import { AuthSync } from "@/components/auth/auth-sync";
import { ApiError } from "@/lib/api/core";

function StoreHydrator() {
  const setHydrated = useUI((s) => s.setHydrated);
  useEffect(() => {
    Promise.all(persistedStores.map((s) => s.persist.rehydrate())).then(setHydrated);
  }, [setHydrated]);
  return null;
}

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="top-center"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !border-border !shadow-lift !font-sans",
          title: "!font-medium",
        },
      }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Don't retry auth/validation/not-found errors; retry network blips once.
            retry: (count, error) => count < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <TooltipProvider delayDuration={250}>
          <StoreHydrator />
          <AuthSync />
          {children}
          <ThemedToaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
