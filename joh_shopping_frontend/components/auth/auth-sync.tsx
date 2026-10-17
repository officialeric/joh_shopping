"use client";

import { useEffect } from "react";
import { setUnauthorizedHandler } from "@/lib/api/core";
import { adminMe } from "@/lib/api/admin";
import { addToWishlist, me, removeFromWishlist, syncWishlist } from "@/lib/api/shop";
import { useAdminAuth, useAuth, useHydrated, useWishlist } from "@/stores";

/**
 * Keeps the cached profiles in the auth stores honest against the Sanctum
 * session: refreshes them on load, clears them when the API answers 401, and
 * mirrors the wishlist to the server while a customer is signed in.
 */
export function AuthSync() {
  const hydrated = useHydrated();
  const userId = useAuth((s) => s.user?.id);
  const adminId = useAdminAuth((s) => s.admin?.id);

  useEffect(() => {
    setUnauthorizedHandler((scope) => {
      if (scope === "admin") useAdminAuth.getState().setAdmin(null);
      else useAuth.getState().setUser(null);
    });
  }, []);

  // Refresh the customer profile, then merge the browser wishlist into the account's.
  useEffect(() => {
    if (!hydrated || !userId) return;
    let cancelled = false;
    me()
      .then((user) => {
        if (cancelled) return;
        useAuth.getState().setUser(user);
        return syncWishlist(useWishlist.getState().ids).then((ids) => !cancelled && useWishlist.setState({ ids }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hydrated, userId]);

  // Refresh the staff member's role and permissions.
  useEffect(() => {
    if (!hydrated || !adminId) return;
    adminMe()
      .then((admin) => useAdminAuth.getState().setAdmin(admin))
      .catch(() => {});
  }, [hydrated, adminId]);

  // Mirror wishlist changes to the account.
  useEffect(() => {
    if (!hydrated || !userId) return;
    return useWishlist.subscribe((state, prev) => {
      state.ids.filter((id) => !prev.ids.includes(id)).forEach((id) => addToWishlist(id).catch(() => {}));
      prev.ids.filter((id) => !state.ids.includes(id)).forEach((id) => removeFromWishlist(id).catch(() => {}));
    });
  }, [hydrated, userId]);

  return null;
}
