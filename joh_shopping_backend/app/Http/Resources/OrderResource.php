<?php

namespace App\Http\Resources;

use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\OrderItem;
use Illuminate\Http\Request;

/**
 * @mixin Order
 */
class OrderResource extends ApiResource
{
    protected array $optional = ['couponCode', 'address', 'pickupStoreId', 'courier', 'notes'];

    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'customerId' => $this->user_id ?? 'guest',
            'customerName' => $this->customer_name,
            'customerEmail' => $this->customer_email,
            'customerPhone' => $this->customer_phone,
            'items' => $this->items->map(fn (OrderItem $item): array => array_filter([
                'productId' => $item->product_id,
                'variantId' => $item->variant_id,
                'name' => $item->name,
                'variantLabel' => $item->variant_label,
                'price' => $item->price,
                'qty' => $item->qty,
                'imei' => $item->imei ?: null,
            ], fn (mixed $value): bool => $value !== null))->values(),
            'subtotal' => $this->subtotal,
            'discount' => $this->discount,
            'shippingFee' => $this->shipping_fee,
            'total' => $this->total,
            'couponCode' => $this->coupon_code,
            'status' => $this->status,
            'paymentStatus' => $this->payment_status,
            'paymentMethod' => $this->payment_method,
            'deliveryMethod' => $this->delivery_method,
            'address' => $this->address,
            'pickupStoreId' => $this->pickup_store_id,
            'courier' => $this->courier,
            'timeline' => $this->events->map(fn (OrderEvent $event): array => array_filter([
                'status' => $event->status,
                'at' => self::iso($event->at),
                'note' => $event->note,
                'by' => $event->by,
            ], fn (mixed $value): bool => $value !== null))->values(),
            'notes' => $this->notes,
            'createdAt' => self::iso($this->created_at),
        ];
    }
}
