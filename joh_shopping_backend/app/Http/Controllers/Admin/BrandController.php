<?php

namespace App\Http\Controllers\Admin;

use App\Http\Resources\BrandResource;
use App\Models\Brand;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * @extends ResourceController<Brand>
 */
class BrandController extends ResourceController
{
    protected string $noun = 'brand';

    protected bool $affectsStorefront = true;

    protected string $defaultSort = 'name';

    protected function model(): string
    {
        return Brand::class;
    }

    protected function resource(): string
    {
        return BrandResource::class;
    }

    protected function label(Model $model): string
    {
        return $model->name;
    }

    protected function withRelations(Builder $query): Builder
    {
        return $query->withCount('products');
    }

    protected function searchable(): array
    {
        return ['name', 'slug'];
    }

    protected function sortable(): array
    {
        return ['name' => 'name', 'country' => 'country', 'createdAt' => 'created_at', 'productCount' => 'products_count'];
    }

    protected function filterable(): array
    {
        return ['active' => 'active'];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [
            'slug' => ['required', 'string', 'max:160', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('brands', 'slug')->ignore($model?->getKey())],
            'name' => ['required', 'string', 'max:120'],
            'country' => ['nullable', 'string', 'max:80'],
            'active' => ['required', 'boolean'],
        ];
    }

    protected function ensureDeletable(Model $model): void
    {
        if ($model->products()->exists()) {
            throw ValidationException::withMessages(['id' => 'has_products']);
        }
    }
}
