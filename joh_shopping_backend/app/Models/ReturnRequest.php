<?php

namespace App\Models;

use App\Models\Concerns\HasPrefixedId;
use Illuminate\Database\Eloquent\Attributes\Unguarded;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A return or warranty claim (RMA).
 */
#[Unguarded]
class ReturnRequest extends Model
{
    use HasPrefixedId;

    public static function idPrefix(): string
    {
        return 'rma';
    }

    protected function casts(): array
    {
        return [
            'refund_amount' => 'integer',
        ];
    }

    /**
     * What is still refundable on the order's payment (0 when it was never paid).
     */
    public function refundable(): int
    {
        $payment = $this->order?->payment;
        if (! $payment || ! in_array($payment->status, ['paid', 'partially_refunded'], true)) {
            return 0;
        }

        return $payment->amount - $payment->refunded;
    }

    /**
     * The returned line's unit price (the customer picks "Name (Variant)"), capped at what is refundable.
     */
    public function suggestedRefund(): int
    {
        $item = $this->order?->items->first(
            fn (OrderItem $item): bool => "{$item->name} ({$item->variant_label})" === $this->product_name || $item->name === $this->product_name
        );

        return min($item->price ?? $this->refundable(), $this->refundable());
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
