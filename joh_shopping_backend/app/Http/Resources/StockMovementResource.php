<?php

namespace App\Http\Resources;

use App\Models\StockMovement;
use Illuminate\Http\Request;

/**
 * @mixin StockMovement
 */
class StockMovementResource extends ApiResource
{
    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'productId' => (string) $this->product_id,
            'variantId' => (string) $this->variant_id,
            'productName' => $this->product_name,
            'variantLabel' => $this->variant_label,
            'type' => $this->type,
            'qty' => $this->qty,
            'reason' => $this->reason,
            'by' => $this->by,
            'createdAt' => self::iso($this->created_at),
        ];
    }
}
