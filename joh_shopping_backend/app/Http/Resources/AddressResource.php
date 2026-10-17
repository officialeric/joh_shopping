<?php

namespace App\Http\Resources;

use App\Models\Address;
use Illuminate\Http\Request;

/**
 * @mixin Address
 */
class AddressResource extends ApiResource
{
    protected array $optional = ['landmark'];

    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'label' => $this->label,
            'fullName' => $this->full_name,
            'phone' => $this->phone,
            'region' => $this->region,
            'district' => $this->district,
            'street' => $this->street,
            'landmark' => $this->landmark,
            'isDefault' => $this->is_default,
        ];
    }
}
