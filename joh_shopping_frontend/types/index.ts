/**
 * Domain models. Shapes mirror what the Laravel API Resources return,
 * field for field (see ../joh_shopping_backend/app/Http/Resources).
 */

export type ID = string;

/** Bilingual text. Swahili is the default language. */
export type Localized = { sw: string; en: string };

// ---------------------------------------------------------------- Catalog

export type ProductArtKind =
  | "phone"
  | "case"
  | "charger"
  | "cable"
  | "powerbank"
  | "earbuds"
  | "headphones"
  | "watch"
  | "protector"
  | "speaker";

export type CameraStyle = "trio-square" | "duo-diagonal" | "vertical" | "bar" | "circle" | "square-quad";

export interface Category {
  id: ID;
  slug: string;
  name: Localized;
  description: Localized;
  parentId: ID | null;
  icon: string; // lucide icon key, see components/brand/category-icon
  art: ProductArtKind;
  productCount: number;
  active: boolean;
  sortOrder: number;
}

export interface Brand {
  id: ID;
  slug: string;
  name: string;
  country: string;
  active: boolean;
  productCount: number;
}

export interface ColorOption {
  name: Localized;
  hex: string;
}

export interface ProductVariant {
  id: ID;
  sku: string;
  color: string; // hex, matches ColorOption.hex
  storage?: string;
  ram?: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
}

export interface SpecGroup {
  group: Localized;
  items: { label: Localized; value: string }[];
}

export type ProductCondition = "new" | "used";
export type UsedGrade = "A" | "B" | "C";
export type ProductTag = "new" | "bestseller" | "deal" | "featured" | "trending";
export type ProductStatus = "published" | "draft" | "archived";

export interface Product {
  id: ID;
  slug: string;
  name: string;
  brandId: ID;
  categoryId: ID;
  condition: ProductCondition;
  grade?: UsedGrade;
  batteryHealth?: number; // used phones only
  shortDescription: Localized;
  description: Localized;
  highlights: Localized[];
  inBox: Localized[];
  price: number; // lowest variant price
  compareAtPrice?: number;
  colors: ColorOption[];
  storages: string[];
  rams: string[];
  variants: ProductVariant[];
  specs: SpecGroup[];
  rating: number;
  reviewCount: number;
  sold: number;
  warrantyMonths: number;
  tags: ProductTag[];
  images: string[]; // real photos later; empty -> ProductArt illustration
  art: { kind: ProductArtKind; camera?: CameraStyle };
  compatibleWith: ID[];
  status: ProductStatus;
  lowStockThreshold: number;
  seo: { title: string; description: string };
  createdAt: string;
}

export interface Review {
  id: ID;
  productId: ID;
  customerName: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  helpful: number;
  status: "approved" | "pending" | "hidden";
  reply?: string;
  createdAt: string;
}

export interface ProductQuestion {
  id: ID;
  productId: ID;
  question: string;
  answer?: string;
  askedBy: string;
  published?: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------- Cart & checkout

export interface CartLine {
  productId: ID;
  variantId: ID;
  qty: number;
}

export type MobileMoneyProvider = "mpesa" | "mixx" | "airtel" | "halopesa" | "tpesa" | "azampesa";
export type PaymentMethod = "card" | MobileMoneyProvider | "cod";
export type DeliveryMethod = "standard" | "express" | "pickup";

export interface Coupon {
  id: ID;
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  minSpend: number;
  maxDiscount?: number;
  usageLimit: number;
  used: number;
  startsAt: string;
  expiresAt: string;
  active: boolean;
  description: Localized;
}

// ---------------------------------------------------------------- Customers & orders

export interface Address {
  id: ID;
  label: string;
  fullName: string;
  phone: string;
  region: string;
  district: string;
  street: string;
  landmark?: string;
  isDefault: boolean;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentStatus = "paid" | "pending" | "failed" | "refunded" | "partially_refunded";

export interface OrderItem {
  productId: ID;
  variantId: ID;
  name: string;
  variantLabel: string;
  price: number;
  qty: number;
  imei?: string[];
}

export interface OrderEvent {
  status: OrderStatus;
  at: string;
  note?: string;
  by?: string;
}

export interface Order {
  id: ID;
  number: string;
  customerId: ID;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  couponCode?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  address?: Omit<Address, "id" | "isDefault" | "label">;
  pickupStoreId?: ID;
  courier?: { name: string; trackingNumber: string; phone: string };
  timeline: OrderEvent[];
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: ID;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  status: "active" | "blocked";
  ordersCount: number;
  totalSpent: number;
  lastOrderAt?: string;
  region: string;
  newsletter: boolean;
  emailVerified?: boolean;
  /** Saved addresses (detail view only). */
  addresses?: Address[];
  createdAt: string;
}

export interface Payment {
  id: ID;
  reference: string;
  orderId: ID;
  orderNumber: string;
  customerName: string;
  method: PaymentMethod;
  amount: number;
  refunded: number;
  status: PaymentStatus;
  payerPhone?: string;
  cardLast4?: string;
  gateway?: string;
  createdAt: string;
}

export type ReturnType = "return" | "warranty";
export type ReturnStatus = "requested" | "approved" | "received" | "repaired" | "refunded" | "rejected" | "completed";

export interface ReturnRequest {
  id: ID;
  number: string;
  type: ReturnType;
  orderId: ID;
  orderNumber: string;
  customerId: ID;
  customerName: string;
  productName: string;
  imei?: string;
  reason: string;
  details: string;
  status: ReturnStatus;
  resolution?: "refund" | "replacement" | "repair";
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: ID;
  title: Localized;
  body: Localized;
  type: "order" | "promo" | "account" | "stock";
  read: boolean;
  href?: string;
  createdAt: string;
}

// ---------------------------------------------------------------- Admin / back office

export type Permission =
  | "dashboard.view"
  | "products.manage"
  | "categories.manage"
  | "inventory.manage"
  | "orders.view"
  | "orders.manage"
  | "payments.view"
  | "payments.refund"
  | "returns.manage"
  | "customers.manage"
  | "staff.manage"
  | "roles.manage"
  | "promotions.manage"
  | "reviews.manage"
  | "content.manage"
  | "shipping.manage"
  | "messages.manage"
  | "reports.view"
  | "activity.view"
  | "settings.manage";

export interface Role {
  id: ID;
  name: string;
  description: Localized;
  permissions: Permission[];
  system: boolean;
  /** Staff members holding this role. */
  staffCount?: number;
}

export interface Staff {
  id: ID;
  name: string;
  email: string;
  phone: string;
  roleId: ID;
  status: "active" | "suspended" | "invited";
  lastActiveAt?: string;
  createdAt: string;
}

export interface StockMovement {
  id: ID;
  productId: ID;
  variantId: ID;
  productName: string;
  variantLabel: string;
  type: "in" | "out" | "adjustment" | "return";
  qty: number;
  reason: string;
  by: string;
  createdAt: string;
}

export interface SerialRecord {
  id: ID;
  imei: string;
  productId: ID;
  productName: string;
  variantLabel: string;
  status: "in_stock" | "sold" | "returned" | "defective";
  orderNumber?: string;
  customerName?: string;
  soldAt?: string;
  warrantyUntil?: string;
  receivedAt: string;
}

export interface FlashSale {
  id: ID;
  name: Localized;
  startsAt: string;
  endsAt: string;
  active: boolean;
  items: { productId: ID; salePrice: number; quantity: number; sold: number }[];
}

export interface Banner {
  id: ID;
  title: Localized;
  subtitle: Localized;
  cta: Localized;
  href: string;
  productId?: ID;
  placement: "hero" | "promo" | "category";
  theme: "red" | "dark" | "light";
  active: boolean;
  sortOrder: number;
  image?: string;
}

export interface CmsPage {
  id: ID;
  slug: string;
  title: Localized;
  body: Localized;
  updatedAt: string;
  published: boolean;
}

export interface ContactMessage {
  id: ID;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: "new" | "read" | "replied" | "archived";
  reply?: string;
  repliedAt?: string;
  createdAt: string;
}

export interface Subscriber {
  id: ID;
  email: string;
  source: "footer" | "checkout" | "popup";
  active: boolean;
  createdAt: string;
}

export interface ShippingZone {
  id: ID;
  name: string;
  regions: string[];
  standardFee: number;
  expressFee: number;
  freeAbove: number;
  standardDays: string;
  expressDays: string;
  active: boolean;
}

export interface PickupStore {
  id: ID;
  name: string;
  region: string;
  address: string;
  phone: string;
  hours: Localized;
  mapUrl: string;
}

export interface ActivityLog {
  id: ID;
  actor: string;
  action: string;
  subject: string;
  meta?: string;
  ip: string;
  createdAt: string;
}

export interface StoreSettings {
  storeName: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  currency: "TZS";
  vatRate: number;
  pricesIncludeVat: boolean;
  defaultLocale: "sw" | "en";
  paymentMethods: Record<PaymentMethod, boolean>;
  lowStockAlert: number;
  orderPrefix: string;
  maintenanceMode: boolean;
  notifyOnNewOrder: boolean;
  notifyOnLowStock: boolean;
}

// ---------------------------------------------------------------- API envelopes (Laravel style)

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ListParams {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: string; // "field" or "-field"
  filters?: Record<string, string | undefined>;
}

export interface User {
  id: ID;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  emailVerified: boolean;
  twoFactor: boolean;
  createdAt: string;
}

export interface AdminUser {
  id: ID;
  name: string;
  email: string;
  roleId: ID;
  roleName: string;
  permissions: Permission[];
}

export interface AttributeValue {
  id: ID;
  type: "color" | "storage" | "ram" | "grade";
  value: string;
  label?: Localized;
  hex?: string;
}

export interface SavedPaymentMethod {
  id: ID;
  customerId: ID;
  method: PaymentMethod;
  label: string;
  isDefault: boolean;
}

export interface CustomerPreferences {
  language: "sw" | "en";
  notifyEmail: boolean;
  notifySms: boolean;
  notifyWhatsapp: boolean;
  orderUpdates: boolean;
  promotions: boolean;
  priceDrops: boolean;
  newsletter: boolean;
  preferredPayment: PaymentMethod;
  preferredDelivery: DeliveryMethod;
}

/** What checkout returns about the payment it started. */
export interface PaymentInitiation {
  status: "paid" | "pending" | "failed";
  action: "none" | "stk_push" | "redirect";
  redirectUrl: string | null;
  message: string | null;
  reference: string;
}

export type PublicSettings = Pick<
  StoreSettings,
  "storeName" | "email" | "phone" | "whatsapp" | "address" | "currency" | "vatRate" | "pricesIncludeVat" | "defaultLocale" | "paymentMethods" | "maintenanceMode"
>;

/** Everything the storefront renders from (GET /api/bootstrap), cached by Next. */
export interface ShopData {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  zones: ShippingZone[];
  stores: PickupStore[];
  regions: string[];
  settings: PublicSettings;
  flashSale: FlashSale | null;
  banners: Banner[];
  pages: { slug: string; title: Localized }[];
}
