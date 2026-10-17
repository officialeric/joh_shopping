"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** False during SSR/prerender and hydration, true afterwards. */
export function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function subscribeClock(callback: () => void) {
  const id = setInterval(callback, 1000);
  return () => clearInterval(id);
}

/** Current time (to the second) on the client; null while prerendering. */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribeClock,
    () => Math.floor(Date.now() / 1000) * 1000,
    () => null,
  );
}
