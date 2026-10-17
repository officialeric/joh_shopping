<?php

namespace App\Http\Resources;

use App\Models\ShippingZone;
use Illuminate\Http\Request;

/**
 * @mixin ShippingZone
 */
class ShippingZoneResource extends ApiResource
{
    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'regions' => $this->regions,
            'standardFee' => $this->standard_fee,
            'expressFee' => $this->express_fee,
            'freeAbove' => $this->free_above,
            'standardDays' => $this->standard_days,
            'expressDays' => $this->express_days,
            'active' => $this->active,
        ];
    }
}
