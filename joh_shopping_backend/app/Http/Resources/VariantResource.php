<?php

namespace App\Http\Resources;

use App\Models\ProductVariant;
use Illuminate\Http\Request;

/**
 * @mixin ProductVariant
 */
class VariantResource extends ApiResource
{
    protected array $optional = ['storage', 'ram', 'compareAtPrice'];

    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'color' => $this->color,
            'storage' => $this->storage,
            'ram' => $this->ram,
            'price' => $this->price,
            'compareAtPrice' => $this->compare_at_price,
            'stock' => $this->stock,
        ];
    }
}
