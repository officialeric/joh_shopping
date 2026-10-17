<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Resources\BannerResource;
use App\Http\Resources\CouponResource;
use App\Http\Resources\FlashSaleResource;
use App\Http\Resources\PageResource;
use App\Http\Resources\PickupStoreResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ShippingZoneResource;
use App\Models\Banner;
use App\Models\Coupon;
use App\Models\Page;
use App\Models\PickupStore;
use App\Models\ShippingZone;
use App\Support\StoreSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Public storefront content: banners, deals, CMS pages, shipping, store info.
 */
class ContentController extends Controller
{
    public const REGIONS = [
        'Dar es Salaam', 'Arusha', 'Dodoma', 'Mwanza', 'Mbeya', 'Morogoro', 'Tanga', 'Kilimanjaro',
        'Zanzibar (Mjini Magharibi)', 'Pwani', 'Iringa', 'Tabora', 'Kigoma', 'Kagera', 'Mara', 'Shinyanga',
        'Simiyu', 'Geita', 'Singida', 'Manyara', 'Ruvuma', 'Lindi', 'Mtwara', 'Njombe', 'Rukwa', 'Katavi',
        'Songwe', 'Pemba',
    ];

    public function settings(): JsonResponse
    {
        return response()->json(['data' => StoreSettings::public()]);
    }

    public function banners(Request $request): AnonymousResourceCollection
    {
        return BannerResource::collection(
            Banner::query()->where('active', true)
                ->when($request->filled('placement'), fn ($query) => $query->where('placement', $request->string('placement')))
                ->orderBy('sort_order')
                ->get()
        );
    }

    /**
     * The deals page: featured flash sale, active public coupons, discounted products.
     */
    public function deals(CatalogController $catalog): JsonResponse
    {
        $sale = $catalog->currentFlashSale();
        $coupons = Coupon::query()->where('active', true)
            ->where('starts_at', '<=', now())->where('expires_at', '>', now())
            ->orderBy('min_spend')
            ->get();

        return response()->json(['data' => [
            'flashSale' => $sale ? (new FlashSaleResource($sale))->resolve() : null,
            'coupons' => CouponResource::collection($coupons->filter(fn (Coupon $coupon): bool => $coupon->usage_limit === 0 || $coupon->used < $coupon->usage_limit)->values())
                ->resolve(),
            'products' => ProductResource::collection($catalog->deals(24))->resolve(),
        ]]);
    }

    public function flashSale(CatalogController $catalog): JsonResponse
    {
        $sale = $catalog->currentFlashSale();

        return response()->json(['data' => $sale ? (new FlashSaleResource($sale))->resolve() : null]);
    }

    public function pages(): AnonymousResourceCollection
    {
        return PageResource::collection(Page::query()->where('published', true)->orderBy('slug')->get());
    }

    public function page(string $slug): PageResource
    {
        return new PageResource(Page::query()->where('published', true)->where('slug', $slug)->firstOrFail());
    }

    public function shippingZones(): AnonymousResourceCollection
    {
        return ShippingZoneResource::collection(ShippingZone::query()->where('active', true)->orderBy('standard_fee')->get());
    }

    public function pickupStores(): AnonymousResourceCollection
    {
        return PickupStoreResource::collection(PickupStore::query()->orderBy('name')->get());
    }

    public function regions(): JsonResponse
    {
        return response()->json(['data' => self::REGIONS]);
    }
}
