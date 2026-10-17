<?php

namespace App\Http\Resources;

use App\Models\PickupStore;
use Illuminate\Http\Request;

/**
 * @mixin PickupStore
 */
class PickupStoreResource extends ApiResource
{
    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'region' => $this->region,
            'address' => $this->address,
            'phone' => $this->phone,
            'hours' => $this->hours,
            'mapUrl' => (string) $this->map_url,
        ];
    }
}
