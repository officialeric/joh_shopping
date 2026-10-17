import type {
  Address,
  AppNotification,
  CartLine,
  Coupon,
  CustomerPreferences,
  DeliveryMethod,
  Order,
  PaymentInitiation,
  PaymentMethod,
  ProductQuestion,
  ReturnRequest,
  Review,
  SavedPaymentMethod,
  User,
} from "@/types";
import { api, apiData } from "./core";

/**
 * Customer-facing endpoints. The signed-in customer comes from the Sanctum
 * session cookie, so none of these take a user id.
 */

// ---------------------------------------------------------------- Auth

export type LoginResult = { user: User; twoFactor?: false } | { user?: undefined; twoFactor: true };

/** POST /api/login — email or phone. With two-step verification on, a code is emailed instead. */
export async function login(identifier: string, password: string, remember = true): Promise<LoginResult> {
  const res = await api<{ data?: User; twoFactor?: boolean }>("/login", { method: "POST", body: { identifier, password, remember } });
  return res.twoFactor ? { twoFactor: true } : { user: res.data! };
}

/** POST /api/two-factor-challenge */
export function twoFactorChallenge(code: string): Promise<User> {
  return apiData<User>("/two-factor-challenge", { method: "POST", body: { code } });
}

/** POST /api/register — signs the customer in and sends a verification email. */
export function register(input: { name: string; email: string; phone: string; password: string; language?: "sw" | "en" }): Promise<User> {
  return apiData<User>("/register", { method: "POST", body: input });
}

export async function logout() {
  await api("/logout", { method: "POST" });
}

/** GET /api/user */
export function me(): Promise<User> {
  return apiData<User>("/user");
}

/** POST /api/forgot-password — always succeeds so it doesn't reveal which emails exist. */
export async function forgotPassword(email: string) {
  await api("/forgot-password", { method: "POST", body: { email } });
}

/** POST /api/reset-password — token and email come from the emailed link. */
export async function resetPassword(input: { token: string; email: string; password: string }) {
  await api("/reset-password", { method: "POST", body: input });
}

/** Follows the signed API link from the verification email (passed to /verify-email?verifyUrl=…). */
export async function verifyEmail(verifyUrl: string) {
  const url = new URL(verifyUrl);
  await api(url.pathname.replace(/^\/api/, "") + url.search);
}

/** POST /api/email/verification-notification */
export async function resendVerification() {
  await api("/email/verification-notification", { method: "POST" });
}

/** PUT /api/user/password */
export async function changePassword(current: string, password: string) {
  await api("/user/password", { method: "PUT", body: { current, password } });
}

/** PUT /api/user/profile */
export function updateProfile(patch: Partial<Pick<User, "name" | "email" | "phone" | "twoFactor">>): Promise<User> {
  return apiData<User>("/user/profile", { method: "PUT", body: patch });
}

/** DELETE /api/user — requires the current password. */
export async function deleteAccount(password: string) {
  await api("/user", { method: "DELETE", body: { password } });
}

// ---------------------------------------------------------------- Preferences

export function getPreferences(): Promise<CustomerPreferences> {
  return apiData<CustomerPreferences>("/user/preferences");
}

export function savePreferences(prefs: Partial<CustomerPreferences>): Promise<CustomerPreferences> {
  return apiData<CustomerPreferences>("/user/preferences", { method: "PUT", body: prefs });
}

// ---------------------------------------------------------------- Cart & checkout

export interface ServerQuote {
  subtotal: number;
  discount: number;
  shipping: number | null;
  total: number;
  freeShipping: boolean;
  coupon: Coupon | null;
  couponError: "invalid" | "min_spend" | null;
  expressAvailable: boolean;
}

/** POST /api/cart/quote — authoritative prices; used to validate coupons. */
export function quoteCart(input: { lines: CartLine[]; couponCode?: string | null; region?: string; delivery?: DeliveryMethod }): Promise<ServerQuote> {
  return apiData<ServerQuote>("/cart/quote", { method: "POST", body: input });
}

export interface CheckoutInput {
  contact: { name: string; email: string; phone: string };
  delivery: DeliveryMethod;
  address?: Omit<Address, "id" | "isDefault" | "label">;
  pickupStoreId?: string;
  paymentMethod: PaymentMethod;
  payerPhone?: string;
  cardLast4?: string;
  notes?: string;
  lines: CartLine[];
  couponCode: string | null;
  subscribe?: boolean;
  locale?: "sw" | "en";
}

/**
 * POST /api/orders. The server re-prices the cart and reserves stock, then the
 * gateway sends a PIN prompt (mobile money) or a 3-D Secure redirect (card).
 */
export async function placeOrder(input: CheckoutInput): Promise<{ order: Order; payment: PaymentInitiation }> {
  const res = await api<{ data: Order; payment: PaymentInitiation }>("/orders", { method: "POST", body: input });
  return { order: res.data, payment: res.payment };
}

/** GET /api/payments/{reference}/status — poll after a PIN prompt. */
export function paymentStatus(reference: string): Promise<{ reference: string; status: string; orderNumber: string; orderStatus: string }> {
  return apiData(`/payments/${encodeURIComponent(reference)}/status`);
}

/** POST /api/orders/{number}/retry-payment */
export async function retryPayment(number: string, input: { paymentMethod?: PaymentMethod; payerPhone?: string; cardLast4?: string }) {
  const res = await api<{ data: Order; payment: PaymentInitiation }>(`/orders/${encodeURIComponent(number)}/retry-payment`, { method: "POST", body: input });
  return { order: res.data, payment: res.payment };
}

// ---------------------------------------------------------------- Orders

/** GET /api/account/orders */
export function myOrders(): Promise<Order[]> {
  return apiData<Order[]>("/account/orders");
}

/** GET /api/account/orders/{idOrNumber} */
export function myOrder(idOrNumber: string): Promise<Order> {
  return apiData<Order>(`/account/orders/${encodeURIComponent(idOrNumber)}`);
}

/** GET /api/orders/lookup/{number} — the order's owner or the browser session that placed it. */
export function getOrderByNumber(number: string): Promise<Order> {
  return apiData<Order>(`/orders/lookup/${encodeURIComponent(number)}`);
}

/** POST /api/track — guest tracking needs the order's email or phone. */
export function trackOrder(number: string, contact: string): Promise<Order> {
  return apiData<Order>("/track", { method: "POST", body: { number, contact } });
}

/** POST /api/account/orders/{id}/cancel */
export function cancelOrder(orderId: string): Promise<Order> {
  return apiData<Order>(`/account/orders/${orderId}/cancel`, { method: "POST" });
}

// ---------------------------------------------------------------- Addresses

export function myAddresses(): Promise<Address[]> {
  return apiData<Address[]>("/addresses");
}

export function saveAddress(address: Omit<Address, "id"> & { id?: string }): Promise<Address> {
  return address.id
    ? apiData<Address>(`/addresses/${address.id}`, { method: "PUT", body: address })
    : apiData<Address>("/addresses", { method: "POST", body: address });
}

export async function deleteAddress(id: string) {
  await api(`/addresses/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------- Notifications

export function myNotifications(): Promise<AppNotification[]> {
  return apiData<AppNotification[]>("/notifications");
}

/** Mark some (ids) or all notifications read. */
export async function markNotificationsRead(ids?: string[]) {
  await api("/notifications/read", { method: "POST", body: ids ? { ids } : {} });
}

// ---------------------------------------------------------------- Saved payment methods

export function mySavedPayments(): Promise<SavedPaymentMethod[]> {
  return apiData<SavedPaymentMethod[]>("/payment-methods");
}

export async function removeSavedPayment(id: string) {
  await api(`/payment-methods/${id}`, { method: "DELETE" });
}

export function addSavedPayment(method: PaymentMethod, label: string): Promise<SavedPaymentMethod> {
  return apiData<SavedPaymentMethod>("/payment-methods", { method: "POST", body: { method, label } });
}

export async function setDefaultSavedPayment(id: string) {
  await api(`/payment-methods/${id}/default`, { method: "POST" });
}

// ---------------------------------------------------------------- Returns & warranty

export function myReturns(): Promise<ReturnRequest[]> {
  return apiData<ReturnRequest[]>("/returns");
}

export function requestReturn(input: {
  orderId: string;
  productName: string;
  type: ReturnRequest["type"];
  reason: string;
  details: string;
  imei?: string;
  resolution: ReturnRequest["resolution"];
}): Promise<ReturnRequest> {
  return apiData<ReturnRequest>("/returns", { method: "POST", body: input });
}

// ---------------------------------------------------------------- Reviews, questions, wishlist

/** Approved reviews, newest first. */
export function reviewsFor(productId: string): Promise<Review[]> {
  return apiData<Review[]>(`/products/${productId}/reviews`, { query: { perPage: 50 } });
}

export function myReviews(): Promise<Review[]> {
  return apiData<Review[]>("/account/reviews");
}

/** Requires sign-in; reviews are published after moderation. */
export function submitReview(input: { productId: string; rating: number; title: string; body: string }): Promise<Review> {
  return apiData<Review>(`/products/${input.productId}/reviews`, { method: "POST", body: { rating: input.rating, title: input.title, body: input.body } });
}

export function questionsFor(productId: string): Promise<ProductQuestion[]> {
  return apiData<ProductQuestion[]>(`/products/${productId}/questions`);
}

/** Questions are published once staff answer them. */
export async function askQuestion(productId: string, question: string) {
  await api(`/products/${productId}/questions`, { method: "POST", body: { question } });
}

export function myWishlist(): Promise<string[]> {
  return apiData<string[]>("/wishlist");
}

export function syncWishlist(ids: string[]): Promise<string[]> {
  return apiData<string[]>("/wishlist/sync", { method: "POST", body: { ids } });
}

export function addToWishlist(productId: string): Promise<string[]> {
  return apiData<string[]>("/wishlist", { method: "POST", body: { productId } });
}

export function removeFromWishlist(productId: string): Promise<string[]> {
  return apiData<string[]>(`/wishlist/${productId}`, { method: "DELETE" });
}

// ---------------------------------------------------------------- Contact, newsletter, stock alerts

export async function sendContactMessage(input: { name: string; email: string; phone?: string; subject: string; message: string }) {
  await api("/contact", { method: "POST", body: { ...input, phone: input.phone || null } });
}

export async function subscribe(email: string, source: "footer" | "checkout" | "popup" = "footer") {
  await api("/newsletter", { method: "POST", body: { email, source } });
}

export async function requestStockAlert(productId: string, email: string) {
  await api(`/products/${productId}/stock-alerts`, { method: "POST", body: { email } });
}
