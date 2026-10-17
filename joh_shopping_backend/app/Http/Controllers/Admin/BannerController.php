<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\LocalizedRules;
use App\Http\Resources\BannerResource;
use App\Models\Banner;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @extends ResourceController<Banner>
 */
class BannerController extends ResourceController
{
    use LocalizedRules;

    protected string $noun = 'banner';

    protected bool $affectsStorefront = true;

    protected string $defaultSort = 'sortOrder';

    protected function model(): string
    {
        return Banner::class;
    }

    protected function resource(): string
    {
        return BannerResource::class;
    }

    protected function label(Model $model): string
    {
        return $model->title['en'] ?? $model->id;
    }

    protected function searchable(): array
    {
        return ['title->en', 'title->sw'];
    }

    protected function sortable(): array
    {
        return ['sortOrder' => 'sort_order', 'createdAt' => 'created_at', 'placement' => 'placement'];
    }

    protected function filterable(): array
    {
        return ['placement' => 'placement', 'active' => 'active', 'theme' => 'theme'];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [
            ...self::localized('title', true, 120),
            ...self::localized('subtitle', true, 300),
            ...self::localized('cta', true, 40),
            'href' => ['required', 'string', 'max:500'],
            'productId' => ['nullable', 'string', 'exists:products,id'],
            'image' => ['nullable', 'string', 'max:2048'],
            'placement' => ['required', Rule::in(['hero', 'promo', 'category'])],
            'theme' => ['required', Rule::in(['red', 'dark', 'light'])],
            'active' => ['required', 'boolean'],
            'sortOrder' => ['required', 'integer', 'min:0'],
        ];
    }
}
