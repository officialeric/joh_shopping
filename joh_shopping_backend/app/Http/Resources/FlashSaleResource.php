<?php

namespace App\Http\Resources;

use App\Models\FlashSale;
use App\Models\FlashSaleItem;
use Illuminate\Http\Request;

/**
 * @mixin FlashSale
 */
class FlashSaleResource extends ApiResource
{
    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'startsAt' => self::iso($this->starts_at),
            'endsAt' => self::iso($this->ends_at),
            'active' => $this->active,
            'items' => $this->items->map(fn (FlashSaleItem $item): array => [
                'productId' => $item->product_id,
                'salePrice' => $item->sale_price,
                'quantity' => $item->quantity,
                'sold' => $item->sold,
            ])->values(),
        ];
    }
}
