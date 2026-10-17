<?php

namespace App\Http\Resources;

use App\Models\Serial;
use Illuminate\Http\Request;

/**
 * @mixin Serial
 */
class SerialResource extends ApiResource
{
    protected array $optional = ['orderNumber', 'customerName', 'soldAt', 'warrantyUntil'];

    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'imei' => $this->imei,
            'productId' => (string) $this->product_id,
            'productName' => $this->product_name,
            'variantLabel' => $this->variant_label,
            'status' => $this->status,
            'orderNumber' => $this->order_number,
            'customerName' => $this->customer_name,
            'soldAt' => self::iso($this->sold_at),
            'warrantyUntil' => self::iso($this->warranty_until),
            'receivedAt' => self::iso($this->received_at),
        ];
    }
}
