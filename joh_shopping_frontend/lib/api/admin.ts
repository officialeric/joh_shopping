import type {
  AdminUser,
  ContactMessage,
  Order,
  OrderStatus,
  Payment,
  Product,
  ProductVariant,
  ReturnRequest,
  Review,
  SerialRecord,
  Staff,
  StockMovement,
  StoreSettings,
} from "@/types";
import { api, apiData } from "./core";

/**
 * Back-office endpoints (/api/admin/*, admin guard + Spatie permissions).
 * The server writes the activity log for every change.
 */

// ---------------------------------------------------------------- Auth

/** POST /api/admin/login */
export function adminLogin(email: string, password: string): Promise<AdminUser> {
  return apiData<AdminUser>("/admin/login", { method: "POST", body: { email, password } });
}

/** GET /api/admin/user — current staff member with effective permissions. */
export function adminMe(): Promise<AdminUser> {
  return apiData<AdminUser>("/admin/user");
}

export async function adminLogout() {
  await api("/admin/logout", { method: "POST" });
}

export async function adminForgotPassword(email: string) {
  await api("/admin/forgot-password", { method: "POST", body: { email } });
}

/** Completes a password reset or a staff invitation. */
export async function adminResetPassword(input: { token: string; email: string; password: string }) {
  await api("/admin/reset-password", { method: "POST", body: { ...input, password_confirmation: input.password } });
}

/** Sidebar badge counts. */
export function navCounts(): Promise<{ orders: number; returns: number; reviews: number; messages: number }> {
  return apiData("/admin/analytics/counts");
}

// ---------------------------------------------------------------- Orders

export function updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Promise<Order> {
  return apiData<Order>(`/admin/orders/${orderId}/status`, { method: "POST", body: { status, note: note || null } });
}

export function assignCourier(orderId: string, courier: NonNullable<Order["courier"]>): Promise<Order> {
  return apiData<Order>(`/admin/orders/${orderId}/courier`, { method: "POST", body: courier });
}

/** Attach IMEIs to phone lines (keyed by variant id) and mark the serials sold. */
export function assignImeis(orderId: string, imeis: Record<string, string[]>): Promise<Order> {
  const cleaned = Object.fromEntries(Object.entries(imeis).map(([variantId, codes]) => [variantId, codes.map((c) => c.trim()).filter(Boolean)]));
  return apiData<Order>(`/admin/orders/${orderId}/imeis`, { method: "POST", body: { imeis: cleaned } });
}

/** The payments recorded against an order (latest first). */
export async function orderPayments(orderId: string): Promise<Payment[]> {
  return apiData<Payment[]>("/admin/payments", { query: { all: 1, "filter[orderId]": orderId } });
}

// ---------------------------------------------------------------- Payments

export function refundPayment(paymentId: string, amount: number, reason: string): Promise<Payment> {
  return apiData<Payment>(`/admin/payments/${paymentId}/refund`, { method: "POST", body: { amount, reason } });
}

// ---------------------------------------------------------------- Inventory

export function adjustStock(productId: string, variantId: string, type: StockMovement["type"], qty: number, reason: string): Promise<ProductVariant> {
  return apiData<ProductVariant>("/admin/inventory/adjust", { method: "POST", body: { productId, variantId, type, qty, reason } });
}

export function registerSerial(productId: string, variantLabel: string, imei: string): Promise<SerialRecord> {
  return apiData<SerialRecord>("/admin/serials", { method: "POST", body: { productId, variantLabel, imei } });
}

// ---------------------------------------------------------------- Catalog

/** Create (no id) or update a product with its variants; returns the saved product. */
export function saveProduct(product: Omit<Product, "id"> & { id?: string }): Promise<Product> {
  return product.id
    ? apiData<Product>(`/admin/products/${product.id}`, { method: "PATCH", body: product })
    : apiData<Product>("/admin/products", { method: "POST", body: product });
}

/** Upload a product or banner image; returns its public URL. */
export async function uploadImage(file: File, folder: "products" | "banners" | "brands" = "products"): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  return (await apiData<{ url: string }>("/admin/uploads", { method: "POST", body: form })).url;
}

// ---------------------------------------------------------------- Returns, reviews, messages, staff

export function updateReturn(id: string, patch: Partial<Pick<ReturnRequest, "status" | "resolution">>): Promise<ReturnRequest> {
  return apiData<ReturnRequest>(`/admin/returns/${id}`, { method: "PATCH", body: patch });
}

export function moderateReview(id: string, patch: { status?: Review["status"]; reply?: string }): Promise<Review> {
  return apiData<Review>(`/admin/reviews/${id}`, { method: "PATCH", body: patch });
}

/** Email a reply to the sender and mark the message replied. */
export function replyMessage(id: string, reply: string): Promise<ContactMessage> {
  return apiData<ContactMessage>(`/admin/messages/${id}/reply`, { method: "POST", body: { reply } });
}

export function resendStaffInvite(id: string): Promise<Staff> {
  return apiData<Staff>(`/admin/staff/${id}/resend-invite`, { method: "POST" });
}

// ---------------------------------------------------------------- Settings

export function getSettings(): Promise<StoreSettings> {
  return apiData<StoreSettings>("/admin/settings");
}

export function saveSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
  return apiData<StoreSettings>("/admin/settings", { method: "PUT", body: settings });
}
