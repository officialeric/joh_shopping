<?php

namespace App\Http\Resources;

use App\Models\SavedPaymentMethod;
use Illuminate\Http\Request;

/**
 * @mixin SavedPaymentMethod
 */
class SavedPaymentMethodResource extends ApiResource
{
    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'customerId' => $this->user_id,
            'method' => $this->method,
            'label' => $this->label,
            'isDefault' => $this->is_default,
        ];
    }
}
