<?php

namespace App\Services;

use App\Http\Resources\CouponResource;
use App\Models\Coupon;
use App\Models\FlashSaleItem;
use App\Models\ProductVariant;
use App\Models\ShippingZone;
use Illuminate\Support\Collection;

/**
 * Server-side twin of the frontend's lib/cart.ts: line prices (incl. live flash
 * sales), coupon, zone-based shipping and totals. Checkout always re-prices here.
 */
class CartPricer
{
    public const FALLBACK_SHIPPING_FEE = 18_000;

    public const FREE_SHIPPING_DAR = 300_000;

    /**
     * @param  list<array{productId: string, variantId: string, qty: int}>  $lines
     * @return array{
     *     items: list<array<string, mixed>>,
     *     missing: list<int>,
     *     count: int,
     *     subtotal: int,
     *     discount: int,
     *     shipping: int|null,
     *     freeShipping: bool,
     *     total: int,
     *     coupon: Coupon|null,
     *     couponError: string|null,
     *     freeShippingRemaining: int,
     *     expressAvailable: bool,
     * }
     */
    public function quote(array $lines, ?string $couponCode, ?string $region, string $delivery = 'standard', bool $lockForUpdate = false): array
    {
        $variantIds = collect($lines)->pluck('variantId')->filter()->unique()->values();
        $variantQuery = ProductVariant::query()->with('product')->whereIn('id', $variantIds);
        if ($lockForUpdate) {
            $variantQuery->lockForUpdate();
        }
        $variants = $variantQuery->get()->keyBy('id');
        $flashItems = $this->liveFlashSaleItems($variants->pluck('product_id')->unique()->values());

        $items = [];
        $missing = [];
        foreach (array_values($lines) as $index => $line) {
            $variant = $variants->get($line['variantId']);
            $product = $variant?->product;

            if (! $variant || ! $product || $product->id !== $line['productId'] || $product->status !== 'published') {
                $missing[] = $index;

                continue;
            }

            $qty = max(1, (int) $line['qty']);
            $flash = $flashItems->get($product->id);
            $unitPrice = $variant->price;
            if ($flash && $flash->sold + $qty <= $flash->quantity) {
                $unitPrice = max(0, $variant->price - max(0, $product->price - $flash->sale_price));
            }

            $items[] = [
                'productId' => $product->id,
                'variantId' => $variant->id,
                'qty' => $qty,
                'name' => $product->name,
                'variantLabel' => $product->variantLabel($variant, 'en'),
                'price' => $variant->price,
                'unitPrice' => $unitPrice,
                'lineTotal' => $unitPrice * $qty,
                'stock' => $variant->stock,
                'flashSale' => $unitPrice < $variant->price,
                'variant' => $variant,
                'product' => $product,
                'flashSaleItem' => $unitPrice < $variant->price ? $flash : null,
            ];
        }

        $subtotal = array_sum(array_column($items, 'lineTotal'));
        $count = array_sum(array_column($items, 'qty'));

        [$coupon, $couponError, $discount] = $this->applyCoupon($couponCode, $subtotal);

        $freeShipping = $coupon && ! $couponError && $coupon->type === 'free_shipping';
        $baseShipping = $this->shippingFee($region, $delivery, $subtotal - $discount);
        $shipping = $freeShipping && $baseShipping !== null ? 0 : $baseShipping;

        return [
            'items' => $items,
            'missing' => $missing,
            'count' => $count,
            'subtotal' => $subtotal,
            'discount' => $discount,
            'shipping' => $shipping,
            'freeShipping' => $freeShipping,
            'total' => max(0, $subtotal - $discount + ($shipping ?? 0)),
            'coupon' => $coupon,
            'couponError' => $couponError,
            'freeShippingRemaining' => max(0, self::FREE_SHIPPING_DAR - ($subtotal - $discount)),
            'expressAvailable' => $this->expressAvailable($region),
        ];
    }

    /**
     * A quote as JSON for the storefront (no models).
     *
     * @param  array<string, mixed>  $quote
     * @return array<string, mixed>
     */
    public static function present(array $quote): array
    {
        return [
            ...$quote,
            'items' => collect($quote['items'])
                ->map(fn (array $item): array => collect($item)->except(['variant', 'product', 'flashSaleItem'])->all())
                ->all(),
            'coupon' => $quote['coupon'] ? (new CouponResource($quote['coupon']))->resolve() : null,
        ];
    }

    public function findCoupon(?string $code): ?Coupon
    {
        $code = mb_strtoupper(trim((string) $code));
        if ($code === '') {
            return null;
        }

        return Coupon::query()
            ->whereRaw('UPPER(code) = ?', [$code])
            ->where('active', true)
            ->where('starts_at', '<=', now())
            ->where('expires_at', '>', now())
            ->get()
            ->first(fn (Coupon $coupon): bool => $coupon->usage_limit === 0 || $coupon->used < $coupon->usage_limit);
    }

    public function zoneForRegion(?string $region): ?ShippingZone
    {
        if (! $region) {
            return null;
        }

        return ShippingZone::query()->where('active', true)->get()
            ->first(fn (ShippingZone $zone): bool => in_array($region, $zone->regions ?? [], true));
    }

    public function shippingFee(?string $region, string $delivery, int $subtotal): ?int
    {
        if ($delivery === 'pickup') {
            return 0;
        }
        if (! $region) {
            return null;
        }

        $zone = $this->zoneForRegion($region);
        if (! $zone) {
            return self::FALLBACK_SHIPPING_FEE;
        }
        if ($delivery === 'express' && $zone->express_fee > 0) {
            return $zone->express_fee;
        }

        return $subtotal >= $zone->free_above ? 0 : $zone->standard_fee;
    }

    public function expressAvailable(?string $region): bool
    {
        return ($this->zoneForRegion($region)?->express_fee ?? 0) > 0;
    }

    /**
     * @return array{0: Coupon|null, 1: string|null, 2: int}
     */
    private function applyCoupon(?string $code, int $subtotal): array
    {
        if (! $code || trim($code) === '') {
            return [null, null, 0];
        }

        $coupon = $this->findCoupon($code);
        if (! $coupon) {
            return [null, 'invalid', 0];
        }
        if ($subtotal < $coupon->min_spend) {
            return [$coupon, 'min_spend', 0];
        }

        $discount = match ($coupon->type) {
            'percent' => (int) round($subtotal * $coupon->value / 100),
            'fixed' => $coupon->value,
            default => 0,
        };
        if ($coupon->max_discount) {
            $discount = min($discount, $coupon->max_discount);
        }

        return [$coupon, null, min($discount, $subtotal)];
    }

    /**
     * @param  Collection<int, string>  $productIds
     * @return Collection<string, FlashSaleItem>
     */
    private function liveFlashSaleItems(Collection $productIds): Collection
    {
        if ($productIds->isEmpty()) {
            return collect();
        }

        return FlashSaleItem::query()
            ->whereIn('product_id', $productIds)
            ->whereHas('flashSale', fn ($query) => $query->where('active', true)
                ->where('starts_at', '<=', now())
                ->where('ends_at', '>', now()))
            ->orderBy('sale_price')
            ->get()
            ->unique('product_id')
            ->keyBy('product_id');
    }
}
