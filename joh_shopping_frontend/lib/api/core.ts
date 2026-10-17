import type {
  ActivityLog,
  AttributeValue,
  Banner,
  Brand,
  Category,
  CmsPage,
  ContactMessage,
  Coupon,
  Customer,
  FlashSale,
  ListParams,
  Order,
  Paginated,
  Payment,
  PickupStore,
  Product,
  ProductQuestion,
  ReturnRequest,
  Review,
  Role,
  SerialRecord,
  ShippingZone,
  Staff,
  StockMovement,
  Subscriber,
} from "@/types";

/**
 * HTTP client for the Laravel API (../joh_shopping_backend).
 *
 * Browser requests use Sanctum SPA cookie auth: the first unsafe request
 * fetches /sanctum/csrf-cookie, then every request sends the session cookie
 * (credentials: "include") and the X-XSRF-TOKEN header.
 */

export const API_URL = (typeof window === "undefined" ? process.env.API_URL : undefined) ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
  }

  /** First machine-readable code, e.g. "invalid_credentials" or "out_of_stock". */
  get code(): string {
    return Object.values(this.errors)[0]?.[0] ?? this.message;
  }
}

type QueryValue = string | number | boolean | null | undefined | (string | number)[];

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
}

type UnauthorizedHandler = (scope: "admin" | "customer") => void;
let onUnauthorized: UnauthorizedHandler = () => {};

/** Lets the auth layer clear a stale session when the API answers 401. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  onUnauthorized = handler;
}

function readXsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]!) : undefined;
}

let csrfRequest: Promise<void> | null = null;

function ensureCsrfCookie(force = false): Promise<void> {
  if (!force && readXsrfToken()) return Promise.resolve();
  if (!force && csrfRequest) return csrfRequest;
  csrfRequest = fetch(`${API_ORIGIN}/sanctum/csrf-cookie`, { credentials: "include", headers: { Accept: "application/json" } })
    .then(() => undefined)
    .finally(() => {
      csrfRequest = null;
    });
  return csrfRequest;
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const url = new URL(API_URL.replace(/\/$/, "") + path);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value == null || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => url.searchParams.append(`${key}[]`, String(v)));
    else url.searchParams.set(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  }
  return url;
}

export async function api<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const method = options.method ?? "GET";
  const isBrowser = typeof window !== "undefined";
  if (isBrowser && method !== "GET") await ensureCsrfCookie();

  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" };
  if (options.body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  const xsrf = readXsrfToken();
  if (xsrf) headers["X-XSRF-TOKEN"] = xsrf;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
      credentials: "include",
      signal: options.signal,
      cache: "no-store",
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError(0, "network_error");
  }

  // Expired CSRF token: refresh it once and retry.
  if (res.status === 419 && isBrowser && !retried) {
    await ensureCsrfCookie(true);
    return api<T>(path, options, true);
  }
  if (res.status === 204) return undefined as T;

  const data = (await res.json().catch(() => ({}))) as { message?: string; errors?: Record<string, string[]> };
  if (!res.ok) {
    if (res.status === 401 && isBrowser) onUnauthorized(path.startsWith("/admin") ? "admin" : "customer");
    throw new ApiError(res.status, data.message ?? res.statusText, data.errors ?? {});
  }
  return data as T;
}

/** Unwraps Laravel's `{ data }` resource envelope. */
export async function apiData<T>(path: string, options?: RequestOptions): Promise<T> {
  return (await api<{ data: T }>(path, options)).data;
}

// ---------------------------------------------------------------- Admin collections

/**
 * Back-office resources and their routes. Each maps 1:1 to
 * /api/admin/{path} (index, show, store, PATCH update, DELETE bulk/single).
 */
export interface AdminCollections {
  products: Product;
  categories: Category;
  brands: Brand;
  attributes: AttributeValue;
  customers: Customer;
  orders: Order;
  payments: Payment;
  returns: ReturnRequest;
  reviews: Review;
  questions: ProductQuestion;
  coupons: Coupon;
  flashSales: FlashSale;
  banners: Banner;
  pages: CmsPage;
  messages: ContactMessage;
  subscribers: Subscriber;
  zones: ShippingZone;
  stores: PickupStore;
  roles: Role;
  staff: Staff;
  stockMovements: StockMovement;
  serials: SerialRecord;
  activity: ActivityLog;
}

export type CollectionKey = keyof AdminCollections;
export type Item<K extends CollectionKey> = AdminCollections[K];

const collectionPaths: Record<CollectionKey, string> = {
  products: "products",
  categories: "categories",
  brands: "brands",
  attributes: "attributes",
  customers: "customers",
  orders: "orders",
  payments: "payments",
  returns: "returns",
  reviews: "reviews",
  questions: "questions",
  coupons: "coupons",
  flashSales: "flash-sales",
  banners: "banners",
  pages: "pages",
  messages: "messages",
  subscribers: "subscribers",
  zones: "shipping-zones",
  stores: "pickup-stores",
  roles: "roles",
  staff: "staff",
  stockMovements: "stock-movements",
  serials: "serials",
  activity: "activity",
};

const adminPath = (key: CollectionKey, id?: string) => `/admin/${collectionPaths[key]}${id ? `/${encodeURIComponent(id)}` : ""}`;

/** GET /api/admin/{resource}?page=&perPage=&search=&sort=&filter[field]= */
export function list<K extends CollectionKey>(key: K, params: ListParams = {}): Promise<Paginated<Item<K>>> {
  const query: Record<string, QueryValue> = {
    page: params.page,
    perPage: params.perPage,
    search: params.search,
    sort: params.sort,
  };
  for (const [field, value] of Object.entries(params.filters ?? {})) {
    if (value && value !== "all") query[`filter[${field}]`] = value;
  }
  return api<Paginated<Item<K>>>(adminPath(key), { query });
}

/** GET /api/admin/{resource}?all=1 */
export function all<K extends CollectionKey>(key: K, filters: Record<string, string> = {}): Promise<Item<K>[]> {
  const query: Record<string, QueryValue> = { all: 1 };
  for (const [field, value] of Object.entries(filters)) query[`filter[${field}]`] = value;
  return apiData<Item<K>[]>(adminPath(key), { query });
}

export function find<K extends CollectionKey>(key: K, id: string): Promise<Item<K>> {
  return apiData<Item<K>>(adminPath(key, id));
}

export function create<K extends CollectionKey>(key: K, data: Omit<Item<K>, "id"> & { id?: string }): Promise<Item<K>> {
  return apiData<Item<K>>(adminPath(key), { method: "POST", body: data });
}

export function update<K extends CollectionKey>(key: K, id: string, patch: Partial<Item<K>>): Promise<Item<K>> {
  return apiData<Item<K>>(adminPath(key, id), { method: "PATCH", body: patch });
}

export async function remove(key: CollectionKey, ids: string[]): Promise<void> {
  await api(adminPath(key), { method: "DELETE", body: { ids } });
}
