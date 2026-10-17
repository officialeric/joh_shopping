import type { Localized, Order, PaymentMethod, Product, ProductVariant } from "@/types";
import { apiData } from "./core";

/**
 * Dashboard and report aggregates, computed in SQL by the API
 * (GET /api/admin/analytics/*). Cancelled orders never count as sales.
 */

type Kpi = { value: number; delta: number };
type DayPoint = { date: string; revenue: number; orders: number };

export interface DashboardStats {
  revenue: Kpi;
  orders: Kpi;
  aov: Kpi;
  customers: Kpi;
  series: DayPoint[];
  byPayment: [PaymentMethod, number][];
  byCategory: { id: string; name: Localized | null; value: number }[];
  byRegion: [string, number][];
  topProducts: { product: Product; qty: number; revenue: number }[];
  recentOrders: Order[];
  lowStock: { product: Product; variant: ProductVariant }[];
  attention: { pendingOrders: number; pendingReturns: number; pendingReviews: number; unreadMessages: number };
}

export interface SalesReport {
  gross: number;
  discounts: number;
  refunds: number;
  shipping: number;
  net: number;
  orders: number;
  series: DayPoint[];
  byBrand: { name: string; units: number; revenue: number }[];
  byCategory: { id: string; name: Localized | null; units: number; revenue: number }[];
  topProducts: { product: Product; units: number; revenue: number }[];
  topCustomers: { id: string; name: string; orders: number; revenue: number }[];
  condition: { new: number; used: number };
}

export function dashboardStats(days: number): Promise<DashboardStats> {
  return apiData<DashboardStats>("/admin/analytics/dashboard", { query: { days } });
}

export function salesReport(days: number): Promise<SalesReport> {
  return apiData<SalesReport>("/admin/analytics/sales", { query: { days } });
}
