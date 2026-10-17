<?php

namespace App\Http\Resources;

use App\Models\AttributeValue;
use Illuminate\Http\Request;

/**
 * @mixin AttributeValue
 */
class AttributeValueResource extends ApiResource
{
    protected array $optional = ['label', 'hex'];

    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'value' => $this->value,
            'label' => $this->label,
            'hex' => $this->hex,
        ];
    }
}
