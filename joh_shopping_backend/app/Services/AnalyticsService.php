<?php

namespace App\Services;

use App\Http\Resources\OrderResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\VariantResource;
use App\Models\Category;
use App\Models\ContactMessage;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ReturnRequest;
use App\Models\Review;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Dashboard and report aggregates. Same shapes as the frontend's
 * lib/api/analytics.ts. Cancelled orders never count towards sales.
 */
class AnalyticsService
{
    /**
     * @return array<string, mixed>
     */
    public function dashboard(int $days): array
    {
        $end = CarbonImmutable::now();
        [$from, $prevFrom] = [$end->subDays($days), $end->subDays($days * 2)];

        $current = $this->totals($from, $end);
        $previous = $this->totals($prevFrom, $from);
        $customers = User::query()->whereBetween('created_at', [$from, $end])->count();
        $previousCustomers = User::query()->whereBetween('created_at', [$prevFrom, $from])->count();
        $aov = $current['orders'] ? $current['revenue'] / $current['orders'] : 0;
        $previousAov = $previous['orders'] ? $previous['revenue'] / $previous['orders'] : 0;

        return [
            'revenue' => ['value' => $current['revenue'], 'delta' => self::pct($current['revenue'], $previous['revenue'])],
            'orders' => ['value' => $current['orders'], 'delta' => self::pct($current['orders'], $previous['orders'])],
            'aov' => ['value' => $aov, 'delta' => self::pct($aov, $previousAov)],
            'customers' => ['value' => $customers, 'delta' => self::pct($customers, $previousCustomers)],
            'series' => $this->series($end, $days),
            'byPayment' => $this->validOrders($from, $end)
                ->selectRaw('payment_method, SUM(total) as amount')
                ->groupBy('payment_method')
                ->orderByDesc('amount')
                ->get()
                ->map(fn (object $row): array => [$row->payment_method, (int) $row->amount])
                ->all(),
            'byCategory' => $this->byCategory($from, $end)
                ->map(fn (array $row): array => ['id' => $row['id'], 'name' => $row['name'], 'value' => $row['revenue']])
                ->all(),
            'byRegion' => $this->validOrders($from, $end)
                ->selectRaw("COALESCE(region, 'Pickup') as region_name, COUNT(*) as orders_count")
                ->groupBy('region_name')
                ->orderByDesc('orders_count')
                ->limit(6)
                ->get()
                ->map(fn (object $row): array => [$row->region_name, (int) $row->orders_count])
                ->all(),
            'topProducts' => $this->topProducts($from, $end, 5)
                ->map(fn (array $row): array => ['product' => $row['product'], 'qty' => $row['units'], 'revenue' => $row['revenue']])
                ->all(),
            'recentOrders' => OrderResource::collection(Order::query()->with(['items', 'events'])->latest()->limit(6)->get())->resolve(),
            'lowStock' => $this->lowStock(6),
            'attention' => $this->attention(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function sales(int $days): array
    {
        $end = CarbonImmutable::now();
        $from = $end->subDays($days);

        $sums = $this->validOrders($from, $end)
            ->selectRaw('COUNT(*) as orders_count, SUM(subtotal) as gross, SUM(discount) as discounts, SUM(shipping_fee) as shipping')
            ->first();

        $refunds = (int) DB::table('payments')
            ->join('orders', 'orders.id', '=', 'payments.order_id')
            ->where('orders.created_at', '>', $from)
            ->where('orders.created_at', '<=', $end)
            ->sum('payments.refunded');

        $gross = (int) $sums->gross;
        $discounts = (int) $sums->discounts;

        $brandRows = $this->itemsInWindow($from, $end)
            ->join('brands', 'brands.id', '=', 'products.brand_id')
            ->selectRaw('brands.name as name, SUM(order_items.qty) as units, SUM(order_items.price * order_items.qty) as revenue')
            ->groupBy('brands.name')
            ->orderByDesc('revenue')
            ->get();

        $condition = $this->itemsInWindow($from, $end)
            ->where('products.category_id', 'c-phones')
            ->selectRaw('products.condition as product_condition, SUM(order_items.price * order_items.qty) as revenue')
            ->groupBy('products.condition')
            ->pluck('revenue', 'product_condition');

        $customers = $this->validOrders($from, $end)
            ->selectRaw("COALESCE(user_id, 'guest') as customer_key, MAX(customer_name) as name, COUNT(*) as orders_count, SUM(total) as revenue")
            ->groupBy('customer_key')
            ->orderByDesc('revenue')
            ->limit(8)
            ->get();

        return [
            'gross' => $gross,
            'discounts' => $discounts,
            'refunds' => $refunds,
            'shipping' => (int) $sums->shipping,
            'net' => $gross - $discounts - $refunds,
            'orders' => (int) $sums->orders_count,
            'series' => $this->series($end, $days),
            'byBrand' => $brandRows->map(fn (object $row): array => ['name' => $row->name, 'units' => (int) $row->units, 'revenue' => (int) $row->revenue])->all(),
            'byCategory' => $this->byCategory($from, $end)->all(),
            'topProducts' => $this->topProducts($from, $end, 10)->all(),
            'topCustomers' => $customers->map(fn (object $row): array => [
                'id' => $row->customer_key,
                'name' => $row->name,
                'orders' => (int) $row->orders_count,
                'revenue' => (int) $row->revenue,
            ])->all(),
            'condition' => ['new' => (int) ($condition['new'] ?? 0), 'used' => (int) ($condition['used'] ?? 0)],
        ];
    }

    /**
     * Badge counts for the admin sidebar.
     *
     * @return array{pendingOrders: int, pendingReturns: int, pendingReviews: int, unreadMessages: int}
     */
    public function attention(): array
    {
        return [
            'pendingOrders' => Order::query()->whereIn('status', ['pending', 'confirmed'])->count(),
            'pendingReturns' => ReturnRequest::query()->where('status', 'requested')->count(),
            'pendingReviews' => Review::query()->where('status', 'pending')->count(),
            'unreadMessages' => ContactMessage::query()->where('status', 'new')->count(),
        ];
    }

    private function validOrders(CarbonImmutable $from, CarbonImmutable $to): QueryBuilder
    {
        return DB::table('orders')
            ->where('status', '!=', 'cancelled')
            ->where('created_at', '>', $from)
            ->where('created_at', '<=', $to);
    }

    private function itemsInWindow(CarbonImmutable $from, CarbonImmutable $to): QueryBuilder
    {
        return DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->where('orders.status', '!=', 'cancelled')
            ->where('orders.created_at', '>', $from)
            ->where('orders.created_at', '<=', $to);
    }

    /**
     * @return array{revenue: int, orders: int}
     */
    private function totals(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $row = $this->validOrders($from, $to)->selectRaw('COUNT(*) as orders_count, SUM(total) as revenue')->first();

        return ['revenue' => (int) $row->revenue, 'orders' => (int) $row->orders_count];
    }

    /**
     * One bucket per day, oldest first, each ending at the same time of day as $end.
     *
     * @return list<array{date: string, revenue: int, orders: int}>
     */
    private function series(CarbonImmutable $end, int $days): array
    {
        $buckets = array_fill(0, $days, ['revenue' => 0, 'orders' => 0]);
        $endTs = $end->getTimestamp();

        $this->validOrders($end->subDays($days), $end)
            ->select(['created_at', 'total'])
            ->orderBy('created_at')
            ->get()
            ->each(function (object $row) use (&$buckets, $endTs, $days): void {
                $age = intdiv(max(0, $endTs - CarbonImmutable::parse($row->created_at)->getTimestamp()), 86_400);
                $index = $days - 1 - min($age, $days - 1);
                $buckets[$index]['revenue'] += (int) $row->total;
                $buckets[$index]['orders']++;
            });

        return array_map(fn (int $i): array => [
            'date' => $end->subDays($days - 1 - $i)->toIso8601ZuluString('millisecond'),
            ...$buckets[$i],
        ], array_keys($buckets));
    }

    /**
     * @return Collection<int, array{id: string, name: array<string, string>|null, units: int, revenue: int}>
     */
    private function byCategory(CarbonImmutable $from, CarbonImmutable $to): Collection
    {
        $names = Category::query()->pluck('name', 'id');

        return $this->itemsInWindow($from, $to)
            ->selectRaw('products.category_id as category_id, SUM(order_items.qty) as units, SUM(order_items.price * order_items.qty) as revenue')
            ->groupBy('products.category_id')
            ->orderByDesc('revenue')
            ->get()
            ->map(fn (object $row): array => [
                'id' => $row->category_id,
                'name' => $names[$row->category_id] ?? null,
                'units' => (int) $row->units,
                'revenue' => (int) $row->revenue,
            ]);
    }

    /**
     * @return Collection<int, array{product: array<string, mixed>, units: int, revenue: int}>
     */
    private function topProducts(CarbonImmutable $from, CarbonImmutable $to, int $limit): Collection
    {
        $rows = $this->itemsInWindow($from, $to)
            ->selectRaw('order_items.product_id as product_id, SUM(order_items.qty) as units, SUM(order_items.price * order_items.qty) as revenue')
            ->groupBy('order_items.product_id')
            ->orderByDesc('revenue')
            ->limit($limit)
            ->get();

        $products = Product::query()->with('variants')->whereKey($rows->pluck('product_id'))->get()->keyBy('id');

        return $rows
            ->filter(fn (object $row): bool => $products->has($row->product_id))
            ->map(fn (object $row): array => [
                'product' => (new ProductResource($products[$row->product_id]))->resolve(),
                'units' => (int) $row->units,
                'revenue' => (int) $row->revenue,
            ])
            ->values();
    }

    /**
     * @return list<array{product: array<string, mixed>, variant: array<string, mixed>}>
     */
    private function lowStock(int $limit): array
    {
        return ProductVariant::query()
            ->join('products', 'products.id', '=', 'product_variants.product_id')
            ->whereColumn('product_variants.stock', '<=', 'products.low_stock_threshold')
            ->where('products.status', '!=', 'archived')
            ->orderBy('product_variants.stock')
            ->limit($limit)
            ->select('product_variants.*')
            ->with('product.variants')
            ->get()
            ->map(fn (ProductVariant $variant): array => [
                'product' => (new ProductResource($variant->product))->resolve(),
                'variant' => (new VariantResource($variant))->resolve(),
            ])
            ->all();
    }

    private static function pct(float|int $current, float|int $previous): float
    {
        if ($previous == 0) {
            return $current > 0 ? 100.0 : 0.0;
        }

        return round(($current - $previous) / $previous * 100, 1);
    }
}
