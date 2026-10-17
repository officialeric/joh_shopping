<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Resources\BannerResource;
use App\Http\Resources\BrandResource;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\FlashSaleResource;
use App\Http\Resources\PickupStoreResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ShippingZoneResource;
use App\Models\Banner;
use App\Models\Brand;
use App\Models\Category;
use App\Models\FlashSale;
use App\Models\Page;
use App\Models\PickupStore;
use App\Models\Product;
use App\Models\ShippingZone;
use App\Support\StoreSettings;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Public catalog. Mirrors the filters and sorts of the frontend's
 * lib/data/catalog.ts so the storefront can switch to the API unchanged.
 */
class CatalogController extends Controller
{
    public const SORTS = ['featured', 'newest', 'price-asc', 'price-desc', 'rating', 'popular'];

    /**
     * GET /api/products?q=&category=&brand[]=&condition[]=&storage[]=&ram[]=&color[]=
     *   &minPrice=&maxPrice=&rating=&inStock=1&deals=1&tag=&ids[]=&sort=&page=&perPage=
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:160'],
            'brand' => ['nullable', 'array'],
            'brand.*' => ['string'],
            'condition' => ['nullable', 'array'],
            'condition.*' => [Rule::in(['new', 'used'])],
            'storage' => ['nullable', 'array'],
            'storage.*' => ['string'],
            'ram' => ['nullable', 'array'],
            'ram.*' => ['string'],
            'color' => ['nullable', 'array'],
            'color.*' => ['string'],
            'minPrice' => ['nullable', 'integer', 'min:0'],
            'maxPrice' => ['nullable', 'integer', 'min:0'],
            'rating' => ['nullable', 'numeric', 'between:0,5'],
            'inStock' => ['nullable', 'boolean'],
            'deals' => ['nullable', 'boolean'],
            'tag' => ['nullable', Rule::in(['new', 'bestseller', 'deal', 'featured', 'trending'])],
            'ids' => ['nullable', 'array', 'max:100'],
            'ids.*' => ['string'],
            'sort' => ['nullable', Rule::in(self::SORTS)],
            'perPage' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $query = $this->search($filters);

        if (! empty($filters['ids'])) {
            $products = $query->get()->sortBy(fn (Product $product): int|false => array_search($product->id, $filters['ids'], true))->values();

            return ProductResource::collection($products);
        }

        return ProductResource::collection($query->paginate($filters['perPage'] ?? 24)->withQueryString());
    }

    public function show(string $slug): JsonResponse
    {
        $product = Product::published()->with('variants')->where('slug', $slug)->firstOrFail();
        $related = $this->related($product, 4);
        $compatible = $this->compatible($product, 4);

        return response()->json([
            'data' => (new ProductResource($product))->resolve(),
            'brand' => (new BrandResource(Brand::findOrFail($product->brand_id)))->resolve(),
            'category' => (new CategoryResource(Category::findOrFail($product->category_id)))->resolve(),
            'related' => ProductResource::collection($related)->resolve(),
            'compatible' => ProductResource::collection($compatible)->resolve(),
            'boughtTogether' => ProductResource::collection($this->boughtTogether($product))->resolve(),
        ]);
    }

    public function categories(): AnonymousResourceCollection
    {
        return CategoryResource::collection(
            Category::query()->where('active', true)
                ->withCount(['products' => fn (Builder $query) => $query->where('status', 'published')])
                ->orderBy('sort_order')
                ->get()
        );
    }

    public function brands(): AnonymousResourceCollection
    {
        return BrandResource::collection(
            Brand::query()->where('active', true)
                ->withCount(['products' => fn (Builder $query) => $query->where('status', 'published')])
                ->orderBy('name')
                ->get()
        );
    }

    /**
     * Everything the storefront renders from, in one request: the published
     * catalog, shipping zones, pickup stores, regions, public settings, the
     * featured flash sale and active banners. The Next.js app caches this.
     */
    public function bootstrap(): JsonResponse
    {
        $sale = $this->currentFlashSale();

        return response()->json(['data' => [
            'products' => ProductResource::collection(Product::published()->with('variants')->orderBy('created_at')->get())->resolve(),
            'categories' => $this->categories()->resolve(),
            'brands' => $this->brands()->resolve(),
            'zones' => ShippingZoneResource::collection(ShippingZone::query()->where('active', true)->orderBy('standard_fee')->get())->resolve(),
            'stores' => PickupStoreResource::collection(PickupStore::query()->orderBy('name')->get())->resolve(),
            'regions' => ContentController::REGIONS,
            'settings' => StoreSettings::public(),
            'flashSale' => $sale ? (new FlashSaleResource($sale))->resolve() : null,
            'banners' => BannerResource::collection(Banner::query()->where('active', true)->orderBy('sort_order')->get())->resolve(),
            'pages' => Page::query()->where('published', true)->orderBy('slug')->get(['slug', 'title'])
                ->map(fn (Page $page): array => ['slug' => $page->slug, 'title' => $page->title])->all(),
        ]]);
    }

    /**
     * Filter options for the product listing.
     */
    public function facets(): JsonResponse
    {
        $products = Product::published()->get(['storages', 'rams', 'colors', 'price']);
        $storageSize = fn (string $value): int => str_ends_with($value, 'TB') ? (int) $value * 1024 : (int) $value;

        return response()->json(['data' => [
            'storages' => $products->pluck('storages')->flatten()->unique()->sortBy($storageSize)->values(),
            'rams' => $products->pluck('rams')->flatten()->unique()->sortBy(fn (string $value): int => (int) $value)->values(),
            'colors' => $products->pluck('colors')->flatten(1)->unique(fn (array $color): string => mb_strtolower($color['name']['en']))->values(),
            'minPrice' => (int) $products->min('price'),
            'maxPrice' => (int) $products->max('price'),
        ]]);
    }

    /**
     * Everything the home page needs in one request.
     */
    public function home(): JsonResponse
    {
        $banners = Banner::query()->where('active', true)->orderBy('sort_order')->get();
        $base = fn () => Product::published()->with('variants');

        return response()->json(['data' => [
            'heroBanners' => BannerResource::collection($banners->where('placement', 'hero')->values())->resolve(),
            'promoBanners' => BannerResource::collection($banners->where('placement', 'promo')->values())->resolve(),
            'flashSale' => ($sale = $this->currentFlashSale()) ? (new FlashSaleResource($sale))->resolve() : null,
            'featured' => ProductResource::collection($base()->whereJsonContains('tags', 'featured')->orderByDesc('sold')->limit(8)->get())->resolve(),
            'newArrivals' => ProductResource::collection($base()->latest()->limit(8)->get())->resolve(),
            'bestSellers' => ProductResource::collection($base()->orderByDesc('sold')->limit(8)->get())->resolve(),
            'deals' => ProductResource::collection($this->deals(8))->resolve(),
            'categories' => $this->categories()->resolve(),
            'brands' => $this->brands()->resolve(),
        ]]);
    }

    /**
     * The flash sale to feature: live now, else the next upcoming one.
     */
    public function currentFlashSale(): ?FlashSale
    {
        $live = FlashSale::query()->with('items')->where('active', true)
            ->where('starts_at', '<=', now())->where('ends_at', '>', now())
            ->orderBy('ends_at')->first();

        return $live ?? FlashSale::query()->with('items')->where('active', true)
            ->where('starts_at', '>', now())->orderBy('starts_at')->first();
    }

    /**
     * @return Collection<int, Product>
     */
    public function deals(int $limit): Collection
    {
        return Product::published()->with('variants')
            ->whereNotNull('compare_at_price')
            ->whereColumn('compare_at_price', '>', 'price')
            ->orderByRaw('(compare_at_price - price) DESC')
            ->limit($limit)
            ->get();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<Product>
     */
    private function search(array $filters): Builder
    {
        $query = Product::published()->with('variants');

        if (! empty($filters['ids'])) {
            $query->whereKey($filters['ids']);
        }

        if (! empty($filters['q'])) {
            $needle = '%'.mb_strtolower($filters['q']).'%';
            $grammar = $query->getQuery()->getGrammar();
            $query->where(fn (Builder $query) => $query
                ->whereRaw('LOWER(name) LIKE ?', [$needle])
                ->orWhereRaw('LOWER('.$grammar->wrap('short_description->en').') LIKE ?', [$needle])
                ->orWhereRaw('LOWER('.$grammar->wrap('short_description->sw').') LIKE ?', [$needle])
                ->orWhereHas('brand', fn (Builder $brand) => $brand->whereRaw('LOWER(name) LIKE ?', [$needle])));
        }

        if (! empty($filters['category'])) {
            $query->whereHas('category', fn (Builder $category) => $category->where('slug', $filters['category']));
        }
        if (! empty($filters['brand'])) {
            $query->whereHas('brand', fn (Builder $brand) => $brand->whereIn('slug', $filters['brand']));
        }
        if (! empty($filters['condition'])) {
            $query->whereIn('condition', $filters['condition']);
        }
        if (! empty($filters['storage'])) {
            $query->whereHas('variants', fn (Builder $variants) => $variants->whereIn('storage', $filters['storage']));
        }
        if (! empty($filters['ram'])) {
            $query->whereHas('variants', fn (Builder $variants) => $variants->whereIn('ram', $filters['ram']));
        }
        if (! empty($filters['color'])) {
            $query->where(function (Builder $query) use ($filters): void {
                foreach ($filters['color'] as $color) {
                    $query->orWhere('search_colors', 'like', '%|'.mb_strtolower($color).'|%');
                }
            });
        }
        if (isset($filters['minPrice'])) {
            $query->where('price', '>=', $filters['minPrice']);
        }
        if (isset($filters['maxPrice'])) {
            $query->where('price', '<=', $filters['maxPrice']);
        }
        if (! empty($filters['rating'])) {
            $query->where('rating', '>=', $filters['rating']);
        }
        if (! empty($filters['inStock'])) {
            $query->whereHas('variants', fn (Builder $variants) => $variants->where('stock', '>', 0));
        }
        if (! empty($filters['deals'])) {
            $query->whereNotNull('compare_at_price')->whereColumn('compare_at_price', '>', 'price');
        }
        if (! empty($filters['tag'])) {
            $query->whereJsonContains('tags', $filters['tag']);
        }

        match ($filters['sort'] ?? 'featured') {
            'newest' => $query->orderByDesc('created_at'),
            'price-asc' => $query->orderBy('price'),
            'price-desc' => $query->orderByDesc('price'),
            'rating' => $query->orderByDesc('rating'),
            'popular' => $query->orderByDesc('sold'),
            default => $query->orderByRaw("CASE WHEN tags LIKE '%\"featured\"%' THEN 1 ELSE 0 END DESC")->orderByDesc('sold'),
        };

        return $query->orderBy('id');
    }

    /**
     * @return Collection<int, Product>
     */
    private function related(Product $product, int $limit): Collection
    {
        return Product::published()->with('variants')
            ->where('category_id', $product->category_id)
            ->whereKeyNot($product->id)
            ->orderByRaw('CASE WHEN brand_id = ? THEN 1 ELSE 0 END DESC', [$product->brand_id])
            ->orderByDesc('sold')
            ->limit($limit)
            ->get();
    }

    /**
     * @return Collection<int, Product>
     */
    private function compatible(Product $product, int $limit): Collection
    {
        $ids = array_slice($product->compatible_with ?? [], 0, $limit);

        return Product::published()->with('variants')->whereKey($ids)->get()
            ->sortBy(fn (Product $item): int|false => array_search($item->id, $ids, true))
            ->values();
    }

    /**
     * Phone + case + charger/audio; other products get related items.
     *
     * @return Collection<int, Product>
     */
    private function boughtTogether(Product $product): Collection
    {
        if (! $product->isPhone()) {
            return $this->related($product, 2);
        }

        $fallback = Product::published()->with('variants')->whereKey(['a-glass', 'a-baseus100w'])->get();

        return $this->compatible($product, 6)->concat($fallback)->unique('id')->take(2)->values();
    }
}
