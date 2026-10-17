<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\LocalizedRules;
use App\Http\Resources\PageResource;
use App\Models\Page;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @extends ResourceController<Page>
 */
class PageController extends ResourceController
{
    use LocalizedRules;

    protected string $noun = 'page';

    protected bool $affectsStorefront = true;

    protected string $defaultSort = 'slug';

    protected function model(): string
    {
        return Page::class;
    }

    protected function resource(): string
    {
        return PageResource::class;
    }

    protected function label(Model $model): string
    {
        return $model->slug;
    }

    protected function searchable(): array
    {
        return ['slug', 'title->en', 'title->sw'];
    }

    protected function sortable(): array
    {
        return ['slug' => 'slug', 'updatedAt' => 'updated_at', 'createdAt' => 'created_at'];
    }

    protected function filterable(): array
    {
        return ['published' => 'published'];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [
            'slug' => ['required', 'string', 'max:120', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('pages', 'slug')->ignore($model?->getKey())],
            ...self::localized('title', true, 160),
            ...self::localized('body', true, 60000),
            'published' => ['required', 'boolean'],
        ];
    }
}
