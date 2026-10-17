<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\LocalizedRules;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\InventoryService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * @extends ResourceController<Product>
 */
class ProductController extends ResourceController
{
    use LocalizedRules;

    public const ART_KINDS = ['phone', 'case', 'charger', 'cable', 'powerbank', 'earbuds', 'headphones', 'watch', 'protector', 'speaker'];

    public const CAMERA_STYLES = ['trio-square', 'duo-diagonal', 'vertical', 'bar', 'circle', 'square-quad'];

    public const TAGS = ['new', 'bestseller', 'deal', 'featured', 'trending'];

    protected string $noun = 'product';

    protected bool $affectsStorefront = true;

    public function __construct(private InventoryService $inventory) {}

    protected function model(): string
    {
        return Product::class;
    }

    protected function resource(): string
    {
        return ProductResource::class;
    }

    protected function label(Model $model): string
    {
        return $model->name;
    }

    protected function withRelations(Builder $query): Builder
    {
        return $query->with('variants');
    }

    protected function searchable(): array
    {
        return ['name', 'slug'];
    }

    protected function sortable(): array
    {
        return ['createdAt' => 'created_at', 'name' => 'name', 'price' => 'price', 'sold' => 'sold', 'rating' => 'rating', 'status' => 'status'];
    }

    protected function filterable(): array
    {
        return [
            'status' => 'status',
            'categoryId' => 'category_id',
            'brandId' => 'brand_id',
            'condition' => 'condition',
            'lowStock' => fn (Builder $query) => $query->whereHas('variants', fn (Builder $variants) => $variants->whereColumn('stock', '<=', 'products.low_stock_threshold')),
        ];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [
            'slug' => ['required', 'string', 'max:160', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('products', 'slug')->ignore($model?->getKey())],
            'name' => ['required', 'string', 'max:255'],
            'brandId' => ['required', 'string', 'exists:brands,id'],
            'categoryId' => ['required', 'string', 'exists:categories,id'],
            'condition' => ['required', Rule::in(['new', 'used'])],
            'grade' => ['nullable', Rule::in(['A', 'B', 'C'])],
            'batteryHealth' => ['nullable', 'integer', 'between:0,100'],
            ...self::localized('shortDescription', true, 500),
            ...self::localized('description', true, 20000),
            ...self::localizedList('highlights'),
            ...self::localizedList('inBox'),
            'compareAtPrice' => ['nullable', 'integer', 'min:0'],
            'colors' => ['required', 'array', 'min:1', 'max:20'],
            'colors.*.name.sw' => ['required', 'string', 'max:60'],
            'colors.*.name.en' => ['required', 'string', 'max:60'],
            'colors.*.hex' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'storages' => ['present', 'array'],
            'storages.*' => ['string', 'max:10'],
            'rams' => ['present', 'array'],
            'rams.*' => ['string', 'max:10'],
            'variants' => ['required', 'array', 'min:1', 'max:100'],
            'variants.*.id' => ['nullable', 'string', 'max:60'],
            'variants.*.sku' => ['required', 'string', 'max:80', 'distinct'],
            'variants.*.color' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'variants.*.storage' => ['nullable', 'string', 'max:10'],
            'variants.*.ram' => ['nullable', 'string', 'max:10'],
            'variants.*.price' => ['required', 'integer', 'min:0'],
            'variants.*.compareAtPrice' => ['nullable', 'integer', 'min:0'],
            'variants.*.stock' => ['required', 'integer', 'min:0'],
            'specs' => ['present', 'array'],
            'specs.*.group.sw' => ['required', 'string', 'max:80'],
            'specs.*.group.en' => ['required', 'string', 'max:80'],
            'specs.*.items' => ['present', 'array'],
            'specs.*.items.*.label.sw' => ['required', 'string', 'max:80'],
            'specs.*.items.*.label.en' => ['required', 'string', 'max:80'],
            'specs.*.items.*.value' => ['required', 'string', 'max:255'],
            'rating' => ['sometimes', 'numeric', 'between:0,5'],
            'reviewCount' => ['sometimes', 'integer', 'min:0'],
            'sold' => ['sometimes', 'integer', 'min:0'],
            'warrantyMonths' => ['required', 'integer', 'between:0,120'],
            'tags' => ['present', 'array'],
            'tags.*' => [Rule::in(self::TAGS)],
            'images' => ['present', 'array', 'max:12'],
            'images.*' => ['string', 'max:2048'],
            'art' => ['required', 'array'],
            'art.kind' => ['required', Rule::in(self::ART_KINDS)],
            'art.camera' => ['nullable', Rule::in(self::CAMERA_STYLES)],
            'compatibleWith' => ['present', 'array'],
            'compatibleWith.*' => ['string', 'max:40'],
            'status' => ['required', Rule::in(['published', 'draft', 'archived'])],
            'lowStockThreshold' => ['required', 'integer', 'min:0'],
            'seo' => ['required', 'array'],
            'seo.title' => ['nullable', 'string', 'max:255'],
            'seo.description' => ['nullable', 'string', 'max:500'],
        ];
    }

    protected function fill(Model $model, array $data): void
    {
        parent::fill($model, Arr::except($data, ['variants']));

        if (array_key_exists('seo', $data)) {
            $model->seo = ['title' => (string) ($data['seo']['title'] ?? ''), 'description' => (string) ($data['seo']['description'] ?? '')];
        }
        if (! $model->exists) {
            $model->setAttribute('price', 0);
        }
    }

    /**
     * @param  Product  $model
     */
    protected function afterSave(Model $model, array $data, bool $created): void
    {
        if (! array_key_exists('variants', $data)) {
            return;
        }

        $this->ensureSkusAreFree($model, $data['variants']);

        $existing = $model->variants()->get()->keyBy('id');
        $keep = [];

        foreach (array_values($data['variants']) as $index => $input) {
            $variant = isset($input['id']) ? $existing->get($input['id']) : null;
            $previousStock = $variant->stock ?? 0;

            $variant ??= new ProductVariant(['id' => $this->newVariantId($model, $existing->keys()->merge($keep)->unique()->values()->all()), 'product_id' => $model->id]);
            $variant->fill([
                'sku' => $input['sku'],
                'color' => strtolower($input['color']),
                'storage' => $input['storage'] ?? null,
                'ram' => $input['ram'] ?? null,
                'price' => $input['price'],
                'compare_at_price' => $input['compareAtPrice'] ?? null,
                'sort_order' => $index,
                'stock' => $previousStock,
            ])->save();
            $variant->setRelation('product', $model);

            $delta = (int) $input['stock'] - $previousStock;
            if ($delta !== 0) {
                $this->inventory->move($variant, $variant->wasRecentlyCreated ? 'in' : 'adjustment', $delta, $variant->wasRecentlyCreated ? 'Initial stock' : 'Edited in product editor');
            }

            $keep[] = $variant->id;
        }

        $model->variants()->whereNotIn('id', $keep)->delete();

        $model->forceFill(['price' => (int) collect($data['variants'])->min('price')])->save();
    }

    /**
     * @param  list<array<string, mixed>>  $variants
     */
    private function ensureSkusAreFree(Product $product, array $variants): void
    {
        $taken = ProductVariant::query()
            ->whereIn('sku', array_column($variants, 'sku'))
            ->where('product_id', '!=', $product->id)
            ->pluck('sku');

        if ($taken->isNotEmpty()) {
            throw ValidationException::withMessages(['variants' => 'sku_taken:'.$taken->implode(',')]);
        }
    }

    /**
     * @param  list<string>  $used
     */
    private function newVariantId(Product $product, array $used): string
    {
        $n = count($used);
        do {
            $id = "{$product->id}-v".$n++;
        } while (in_array($id, $used, true) || ProductVariant::whereKey($id)->exists());

        return $id;
    }
}
