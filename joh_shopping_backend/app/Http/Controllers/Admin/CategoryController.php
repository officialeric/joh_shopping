<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\LocalizedRules;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * @extends ResourceController<Category>
 */
class CategoryController extends ResourceController
{
    use LocalizedRules;

    protected string $noun = 'category';

    protected bool $affectsStorefront = true;

    protected string $defaultSort = 'sortOrder';

    protected function model(): string
    {
        return Category::class;
    }

    protected function resource(): string
    {
        return CategoryResource::class;
    }

    protected function label(Model $model): string
    {
        return $model->name['en'] ?? $model->slug;
    }

    protected function withRelations(Builder $query): Builder
    {
        return $query->withCount('products');
    }

    protected function searchable(): array
    {
        return ['slug', 'name->en', 'name->sw'];
    }

    protected function sortable(): array
    {
        return ['sortOrder' => 'sort_order', 'slug' => 'slug', 'createdAt' => 'created_at', 'productCount' => 'products_count'];
    }

    protected function filterable(): array
    {
        return ['active' => 'active', 'parentId' => 'parent_id'];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [
            'slug' => ['required', 'string', 'max:160', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('categories', 'slug')->ignore($model?->getKey())],
            ...self::localized('name'),
            ...self::localized('description', false, 500),
            'parentId' => ['nullable', 'string', 'exists:categories,id', Rule::notIn([$model?->getKey()])],
            'icon' => ['required', 'string', 'max:40'],
            'art' => ['required', Rule::in(ProductController::ART_KINDS)],
            'active' => ['required', 'boolean'],
            'sortOrder' => ['required', 'integer', 'min:0'],
        ];
    }

    protected function ensureDeletable(Model $model): void
    {
        if ($model->products()->exists()) {
            throw ValidationException::withMessages(['id' => 'has_products']);
        }
    }
}
