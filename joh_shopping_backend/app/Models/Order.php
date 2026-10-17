<?php

namespace App\Models;

use App\Models\Concerns\HasPrefixedId;
use Database\Factories\OrderFactory;
use Illuminate\Database\Eloquent\Attributes\Unguarded;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * A placed order. Customer and line details are snapshots taken at checkout.
 */
#[Unguarded]
class Order extends Model
{
    /** @use HasFactory<OrderFactory> */
    use HasFactory, HasPrefixedId;

    public const STATUSES = ['pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'];

    public const PAYMENT_STATUSES = ['paid', 'pending', 'failed', 'refunded', 'partially_refunded'];

    public const PAYMENT_METHODS = ['card', 'mpesa', 'mixx', 'airtel', 'halopesa', 'tpesa', 'azampesa', 'cod'];

    public const MOBILE_MONEY = ['mpesa', 'mixx', 'airtel', 'halopesa', 'tpesa', 'azampesa'];

    public const DELIVERY_METHODS = ['standard', 'express', 'pickup'];

    public static function idPrefix(): string
    {
        return 'ord';
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'subtotal' => 'integer',
            'discount' => 'integer',
            'shipping_fee' => 'integer',
            'total' => 'integer',
            'address' => 'array',
            'courier' => 'array',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<OrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class)->orderBy('id');
    }

    /**
     * @return HasMany<OrderEvent, $this>
     */
    public function events(): HasMany
    {
        return $this->hasMany(OrderEvent::class)->orderBy('at')->orderBy('id');
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * @return HasOne<Payment, $this>
     */
    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class)->latestOfMany();
    }

    public function isCancellableByCustomer(): bool
    {
        return in_array($this->status, ['pending', 'confirmed'], true);
    }

    public function addEvent(string $status, ?string $note = null, ?string $by = null): OrderEvent
    {
        return $this->events()->create([
            'status' => $status,
            'note' => $note,
            'by' => $by,
            'at' => now(),
        ]);
    }

    /**
     * Whether this contact (email, or phone matched on the last 9 digits) owns the order.
     */
    public function matchesContact(string $contact): bool
    {
        $contact = mb_strtolower(trim($contact));
        $digits = substr(preg_replace('/\D/', '', $contact) ?? '', -9);

        if ($contact !== '' && mb_strtolower($this->customer_email) === $contact) {
            return true;
        }

        return strlen($digits) === 9 && str_ends_with(preg_replace('/\D/', '', $this->customer_phone) ?? '', $digits);
    }
}
