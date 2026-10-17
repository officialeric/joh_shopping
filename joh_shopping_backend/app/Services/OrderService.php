<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Models\Serial;
use App\Notifications\OrderStatusChanged;
use App\Services\Payments\PaymentService;
use App\Support\ActivityLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Order lifecycle after checkout: status changes, cancellations (restock +
 * refund), courier assignment and IMEI recording.
 */
class OrderService
{
    public function __construct(
        private InventoryService $inventory,
        private PaymentService $payments,
    ) {}

    public function updateStatus(Order $order, string $status, ?string $note = null, ?string $by = null): Order
    {
        $previous = $order->status;
        if ($previous === $status && ! $note) {
            return $order;
        }
        if (in_array($previous, ['cancelled', 'returned'], true) && $status !== $previous) {
            throw ValidationException::withMessages(['status' => 'order_closed']);
        }

        DB::transaction(function () use ($order, $status, $note, $by, $previous): void {
            $order->status = $status;
            $order->save();
            $order->addEvent($status, $note ?: null, $by ?? ActivityLogger::actorName());

            if ($status === 'cancelled' && $previous !== 'cancelled') {
                $this->releaseStock($order);
                $this->reverseCustomerTotals($order);
            }

            if ($status === 'delivered' && $previous !== 'delivered') {
                $this->startWarranties($order);
            }
        });

        if ($status === 'cancelled') {
            $this->refundIfPaid($order, $by);
        }

        if ($status === 'delivered' && $order->payment_method === 'cod' && $order->payment_status === 'pending') {
            $this->payments->markPaid($order->payment()->firstOrFail(), 'COD-'.$order->number);
        }

        $order->refresh()->load(['items', 'events']);
        OrderStatusChanged::dispatchFor($order);

        return $order;
    }

    public function cancelByCustomer(Order $order): Order
    {
        if (! $order->isCancellableByCustomer()) {
            throw ValidationException::withMessages(['status' => 'cannot_cancel']);
        }

        return $this->updateStatus($order, 'cancelled', 'Cancelled by customer', $order->customer_name);
    }

    /**
     * @param  array{name: string, trackingNumber: string, phone: string}  $courier
     */
    public function assignCourier(Order $order, array $courier): Order
    {
        $order->update(['courier' => $courier]);
        ActivityLogger::log('assigned courier', "{$order->number} → {$courier['name']}");

        return $order->load(['items', 'events']);
    }

    /**
     * Attach IMEIs to order lines (keyed by variant id) and mark serials sold.
     *
     * @param  array<string, list<string>>  $imeisByVariant
     */
    public function assignImeis(Order $order, array $imeisByVariant): Order
    {
        DB::transaction(function () use ($order, $imeisByVariant): void {
            foreach ($order->items as $item) {
                $codes = array_values(array_unique(array_filter($imeisByVariant[$item->variant_id] ?? [])));
                if (! array_key_exists((string) $item->variant_id, $imeisByVariant)) {
                    continue;
                }

                foreach ($codes as $code) {
                    $taken = Serial::query()->where('imei', $code)
                        ->where('status', 'sold')
                        ->where(fn ($query) => $query->whereNull('order_id')->orWhere('order_id', '!=', $order->id))
                        ->exists();
                    if ($taken) {
                        throw ValidationException::withMessages(["imeis.{$item->variant_id}" => "imei_taken:{$code}"]);
                    }
                }

                $item->update(['imei' => $codes]);

                foreach ($codes as $code) {
                    Serial::updateOrCreate(['imei' => $code], [
                        'product_id' => $item->product_id,
                        'product_name' => $item->name,
                        'variant_label' => $item->variant_label,
                        'status' => 'sold',
                        'order_id' => $order->id,
                        'order_number' => $order->number,
                        'customer_name' => $order->customer_name,
                        'sold_at' => now(),
                        'received_at' => Serial::where('imei', $code)->value('received_at') ?? now(),
                    ]);
                }
            }
        });

        ActivityLogger::log('recorded IMEIs', $order->number);

        return $order->load(['items', 'events']);
    }

    private function releaseStock(Order $order): void
    {
        $order->items->each(function (OrderItem $item) use ($order): void {
            $variant = $item->variant_id ? ProductVariant::query()->with('product')->lockForUpdate()->find($item->variant_id) : null;
            if ($variant) {
                $this->inventory->move($variant, 'return', $item->qty, "Order {$order->number} cancelled");
                $variant->product->decrement('sold', min($item->qty, $variant->product->sold));
            }
        });

        Serial::query()->where('order_id', $order->id)->update([
            'status' => 'in_stock',
            'order_id' => null,
            'order_number' => null,
            'customer_name' => null,
            'sold_at' => null,
            'warranty_until' => null,
        ]);
    }

    private function reverseCustomerTotals(Order $order): void
    {
        $user = $order->user;
        if (! $user) {
            return;
        }

        $user->forceFill([
            'orders_count' => max(0, $user->orders_count - 1),
            'total_spent' => max(0, $user->total_spent - $order->total),
        ])->save();
    }

    private function startWarranties(Order $order): void
    {
        foreach ($order->items as $item) {
            $months = $item->product->warranty_months ?? 12;
            Serial::query()->whereIn('imei', $item->imei ?? [])->update(['warranty_until' => now()->addMonths($months)]);
        }
    }

    private function refundIfPaid(Order $order, ?string $by): void
    {
        $payment = $order->payment()->first();
        if (! $payment || ! in_array($payment->status, ['paid', 'partially_refunded'], true)) {
            if ($payment?->status === 'pending') {
                $payment->update(['status' => 'failed']);
                $order->update(['payment_status' => 'failed']);
            }

            return;
        }

        $this->payments->refund($payment, $payment->amount - $payment->refunded, 'Order cancelled', $by);
    }
}
