<?php

namespace App\Http\Resources;

use App\Models\ReturnRequest;
use Illuminate\Http\Request;

/**
 * @mixin ReturnRequest
 */
class ReturnRequestResource extends ApiResource
{
    protected array $optional = ['imei', 'resolution', 'refundAmount', 'refundable', 'suggestedRefund'];

    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'type' => $this->type,
            'orderId' => $this->order_id,
            'orderNumber' => $this->order?->number,
            'customerId' => $this->user_id ?? 'guest',
            'customerName' => $this->customer_name,
            'productName' => $this->product_name,
            'imei' => $this->imei,
            'reason' => $this->reason,
            'details' => $this->details,
            'status' => $this->status,
            'resolution' => $this->resolution,
            'refundAmount' => $this->refund_amount,
            // Staff only: the admin controller eager-loads the payment and items.
            'refundable' => $this->staffView() ? $this->refundable() : null,
            'suggestedRefund' => $this->staffView() ? $this->suggestedRefund() : null,
            'createdAt' => self::iso($this->created_at),
            'updatedAt' => self::iso($this->updated_at),
        ];
    }

    private function staffView(): bool
    {
        return (bool) $this->order?->relationLoaded('payment') && $this->order->relationLoaded('items');
    }
}
