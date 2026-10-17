<?php

namespace App\Http\Resources;

use App\Models\Payment;
use Illuminate\Http\Request;

/**
 * @mixin Payment
 */
class PaymentResource extends ApiResource
{
    protected array $optional = ['payerPhone', 'cardLast4'];

    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'orderId' => $this->order_id,
            'orderNumber' => $this->order?->number,
            'customerName' => $this->order?->customer_name,
            'method' => $this->method,
            'gateway' => $this->gateway,
            'amount' => $this->amount,
            'refunded' => $this->refunded,
            'status' => $this->status,
            'payerPhone' => $this->payer_phone,
            'cardLast4' => $this->card_last4,
            'createdAt' => self::iso($this->created_at),
        ];
    }
}
