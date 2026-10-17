"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AdminUser, CartLine, Coupon, User } from "@/types";

/*
 * Persisted stores use `skipHydration` and are rehydrated by <StoreHydrator />
 * after mount, so server and first client render match.
 */
const noopStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const storage = createJSONStorage(() => (typeof window === "undefined" ? noopStorage : window.localStorage));

// ---------------------------------------------------------------- Cart

interface CartState {
  lines: CartLine[];
  /** Coupon validated by the API (POST /api/cart/quote); checkout re-checks it. */
  coupon: Coupon | null;
  add: (line: CartLine) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  applyCoupon: (coupon: Coupon | null) => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      coupon: null,
      add: (line) =>
        set((s) => {
          const existing = s.lines.find((l) => l.variantId === line.variantId);
          if (existing) {
            return {
              lines: s.lines.map((l) => (l.variantId === line.variantId ? { ...l, qty: Math.min(99, l.qty + line.qty) } : l)),
            };
          }
          return { lines: [...s.lines, line] };
        }),
      setQty: (variantId, qty) =>
        set((s) => ({ lines: s.lines.map((l) => (l.variantId === variantId ? { ...l, qty: Math.max(1, qty) } : l)) })),
      remove: (variantId) => set((s) => ({ lines: s.lines.filter((l) => l.variantId !== variantId) })),
      clear: () => set({ lines: [], coupon: null }),
      applyCoupon: (coupon) => set({ coupon }),
    }),
    { name: "joh-cart", version: 2, storage, skipHydration: true, migrate: (state) => ({ ...(state as CartState), coupon: null }) },
  ),
);

// ---------------------------------------------------------------- Wishlist / compare / recently viewed

interface ListState {
  ids: string[];
  toggle: (id: string) => boolean; // returns new membership
  remove: (id: string) => void;
  clear: () => void;
}

export const useWishlist = create<ListState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const has = get().ids.includes(id);
        set({ ids: has ? get().ids.filter((x) => x !== id) : [id, ...get().ids] });
        return !has;
      },
      remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
      clear: () => set({ ids: [] }),
    }),
    { name: "joh-wishlist", storage, skipHydration: true },
  ),
);

export const COMPARE_LIMIT = 3;

export const useCompare = create<ListState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const has = get().ids.includes(id);
        if (!has && get().ids.length >= COMPARE_LIMIT) return false;
        set({ ids: has ? get().ids.filter((x) => x !== id) : [...get().ids, id] });
        return !has;
      },
      remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
      clear: () => set({ ids: [] }),
    }),
    { name: "joh-compare", storage, skipHydration: true },
  ),
);

interface RecentState {
  ids: string[];
  push: (id: string) => void;
}

export const useRecent = create<RecentState>()(
  persist(
    (set) => ({
      ids: [],
      push: (id) => set((s) => ({ ids: [id, ...s.ids.filter((x) => x !== id)].slice(0, 12) })),
    }),
    { name: "joh-recent", storage, skipHydration: true },
  ),
);

/** Back-in-stock alerts the visitor has requested. */
export const useStockAlerts = create<RecentState>()(
  persist(
    (set) => ({
      ids: [],
      push: (id) => set((s) => (s.ids.includes(id) ? s : { ids: [...s.ids, id] })),
    }),
    { name: "joh-stock-alerts", storage, skipHydration: true },
  ),
);

// ---------------------------------------------------------------- Auth (Sanctum session; profile cached here for instant UI)

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  updateUser: (patch: Partial<User>) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      updateUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
    }),
    { name: "joh-auth", storage, skipHydration: true },
  ),
);

interface AdminAuthState {
  admin: AdminUser | null;
  setAdmin: (admin: AdminUser | null) => void;
}

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set) => ({
      admin: null,
      setAdmin: (admin) => set({ admin }),
    }),
    // v2: AdminUser carries permissions from the API; older sessions sign in again.
    { name: "joh-admin-auth", version: 2, storage, skipHydration: true, migrate: () => ({ admin: null }) as unknown as AdminAuthState },
  ),
);

// ---------------------------------------------------------------- Ephemeral UI state

interface UIState {
  cartOpen: boolean;
  searchOpen: boolean;
  hydrated: boolean;
  setCartOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setHydrated: () => void;
}

export const useUI = create<UIState>()((set) => ({
  cartOpen: false,
  searchOpen: false,
  hydrated: false,
  setCartOpen: (cartOpen) => set({ cartOpen }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setHydrated: () => set({ hydrated: true }),
}));

export const persistedStores = [useCart, useWishlist, useCompare, useRecent, useStockAlerts, useAuth, useAdminAuth];

/** True once persisted stores have loaded from localStorage. */
export const useHydrated = () => useUI((s) => s.hydrated);
