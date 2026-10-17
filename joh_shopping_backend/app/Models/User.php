<?php

namespace App\Models;

use App\Models\Concerns\HasPrefixedId;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Contracts\Translation\HasLocalePreference;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Unguarded;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * A storefront customer (web guard).
 */
#[Unguarded]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements HasLocalePreference, MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasPrefixedId, Notifiable;

    public const DEFAULT_PREFERENCES = [
        'language' => 'sw',
        'notifyEmail' => true,
        'notifySms' => true,
        'notifyWhatsapp' => false,
        'orderUpdates' => true,
        'promotions' => true,
        'priceDrops' => true,
        'newsletter' => false,
        'preferredPayment' => 'mpesa',
        'preferredDelivery' => 'standard',
    ];

    public static function idPrefix(): string
    {
        return 'cus';
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'newsletter' => 'boolean',
            'two_factor' => 'boolean',
            'preferences' => 'array',
            'orders_count' => 'integer',
            'total_spent' => 'integer',
            'last_order_at' => 'datetime',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function resolvedPreferences(): array
    {
        return [...self::DEFAULT_PREFERENCES, ...($this->preferences ?? [])];
    }

    public function preferredLocale(): string
    {
        return $this->resolvedPreferences()['language'] === 'en' ? 'en' : 'sw';
    }

    public function isBlocked(): bool
    {
        return $this->status === 'blocked';
    }

    /**
     * @return HasMany<Order, $this>
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /**
     * @return HasMany<Address, $this>
     */
    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    /**
     * @return HasMany<SavedPaymentMethod, $this>
     */
    public function savedPaymentMethods(): HasMany
    {
        return $this->hasMany(SavedPaymentMethod::class);
    }

    /**
     * @return HasMany<ReturnRequest, $this>
     */
    public function returnRequests(): HasMany
    {
        return $this->hasMany(ReturnRequest::class);
    }

    /**
     * @return HasMany<Review, $this>
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /**
     * @return BelongsToMany<Product, $this>
     */
    public function wishlist(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'wishlist_items')->withTimestamps();
    }
}
