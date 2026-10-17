<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\LocalizedRules;
use App\Http\Resources\PickupStoreResource;
use App\Models\PickupStore;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * @extends ResourceController<PickupStore>
 */
class PickupStoreController extends ResourceController
{
    use LocalizedRules;

    protected string $noun = 'pickup store';

    protected bool $affectsStorefront = true;

    protected string $defaultSort = 'name';

    protected function model(): string
    {
        return PickupStore::class;
    }

    protected function resource(): string
    {
        return PickupStoreResource::class;
    }

    protected function label(Model $model): string
    {
        return $model->name;
    }

    protected function searchable(): array
    {
        return ['name', 'region', 'address'];
    }

    protected function sortable(): array
    {
        return ['name' => 'name', 'region' => 'region', 'createdAt' => 'created_at'];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'region' => ['required', 'string', 'max:80'],
            'address' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            ...self::localized('hours', true, 120),
            'mapUrl' => ['nullable', 'url', 'max:500'],
        ];
    }
}
