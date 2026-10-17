<?php

namespace App\Http\Controllers\Admin;

use App\Http\Resources\ShippingZoneResource;
use App\Models\ShippingZone;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * @extends ResourceController<ShippingZone>
 */
class ShippingZoneController extends ResourceController
{
    protected string $noun = 'shipping zone';

    protected bool $affectsStorefront = true;

    protected string $defaultSort = 'standardFee';

    protected function model(): string
    {
        return ShippingZone::class;
    }

    protected function resource(): string
    {
        return ShippingZoneResource::class;
    }

    protected function label(Model $model): string
    {
        return $model->name;
    }

    protected function searchable(): array
    {
        return ['name'];
    }

    protected function sortable(): array
    {
        return ['name' => 'name', 'standardFee' => 'standard_fee', 'createdAt' => 'created_at'];
    }

    protected function filterable(): array
    {
        return ['active' => 'active'];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'regions' => ['required', 'array', 'min:1'],
            'regions.*' => ['string', 'max:80', 'distinct'],
            'standardFee' => ['required', 'integer', 'min:0'],
            'expressFee' => ['required', 'integer', 'min:0'],
            'freeAbove' => ['required', 'integer', 'min:0'],
            'standardDays' => ['required', 'string', 'max:10'],
            'expressDays' => ['required', 'string', 'max:10'],
            'active' => ['required', 'boolean'],
        ];
    }
}
