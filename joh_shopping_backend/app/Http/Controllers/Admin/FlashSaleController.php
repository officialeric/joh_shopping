<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\LocalizedRules;
use App\Http\Resources\FlashSaleResource;
use App\Models\FlashSale;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

/**
 * Time-boxed sale prices. While live, checkout charges the sale price (until
 * the item's quantity is sold).
 *
 * @extends ResourceController<FlashSale>
 */
class FlashSaleController extends ResourceController
{
    use LocalizedRules;

    protected string $noun = 'flash sale';

    protected bool $affectsStorefront = true;

    protected function model(): string
    {
        return FlashSale::class;
    }

    protected function resource(): string
    {
        return FlashSaleResource::class;
    }

    protected function label(Model $model): string
    {
        return $model->name['en'] ?? $model->id;
    }

    protected function withRelations(Builder $query): Builder
    {
        return $query->with('items');
    }

    protected function searchable(): array
    {
        return ['name->en', 'name->sw'];
    }

    protected function sortable(): array
    {
        return ['createdAt' => 'created_at', 'startsAt' => 'starts_at', 'endsAt' => 'ends_at'];
    }

    protected function filterable(): array
    {
        return ['active' => 'active'];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [
            ...self::localized('name', true, 120),
            'startsAt' => ['required', 'date'],
            'endsAt' => ['required', 'date', 'after:startsAt'],
            'active' => ['required', 'boolean'],
            'items' => ['present', 'array', 'max:100'],
            'items.*.productId' => ['required', 'string', 'distinct', 'exists:products,id'],
            'items.*.salePrice' => ['required', 'integer', 'min:0'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.sold' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    protected function fill(Model $model, array $data): void
    {
        parent::fill($model, Arr::except($data, ['items']));
    }

    /**
     * @param  FlashSale  $model
     */
    protected function afterSave(Model $model, array $data, bool $created): void
    {
        if (! array_key_exists('items', $data)) {
            return;
        }

        $sold = $model->items()->pluck('sold', 'product_id');
        $model->items()->delete();

        foreach ($data['items'] as $item) {
            $model->items()->create([
                'product_id' => $item['productId'],
                'sale_price' => $item['salePrice'],
                'quantity' => $item['quantity'],
                'sold' => $sold[$item['productId']] ?? ($item['sold'] ?? 0),
            ]);
        }
    }
}
