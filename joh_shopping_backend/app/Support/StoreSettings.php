<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

/**
 * Store-wide settings (Admin → Settings), stored as one JSON row and cached.
 * Shape matches the frontend's StoreSettings type.
 */
class StoreSettings
{
    private const KEY = 'store';

    private const CACHE_KEY = 'settings.store';

    /**
     * @return array<string, mixed>
     */
    public static function defaults(): array
    {
        return [
            'storeName' => 'Joh Shopping',
            'email' => 'support@johshopping.com',
            'phone' => '+255743880848',
            'whatsapp' => '+255743880848',
            'address' => 'Machinga Complex, Dodoma',
            'currency' => 'TZS',
            'vatRate' => 18,
            'pricesIncludeVat' => true,
            'defaultLocale' => 'en',
            'paymentMethods' => [
                'card' => true,
                'mpesa' => true,
                'mixx' => true,
                'airtel' => true,
                'halopesa' => true,
                'tpesa' => true,
                'azampesa' => true,
                'cod' => false,
            ],
            'lowStockAlert' => 5,
            'orderPrefix' => 'JOH-',
            'maintenanceMode' => false,
            'notifyOnNewOrder' => true,
            'notifyOnLowStock' => true,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function all(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function (): array {
            $stored = Setting::find(self::KEY)?->value ?? [];
            $defaults = self::defaults();

            return [
                ...$defaults,
                ...$stored,
                'paymentMethods' => [...$defaults['paymentMethods'], ...($stored['paymentMethods'] ?? [])],
            ];
        });
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return data_get(self::all(), $key, $default);
    }

    /**
     * @param  array<string, mixed>  $settings
     * @return array<string, mixed>
     */
    public static function save(array $settings): array
    {
        $merged = [...self::all(), ...$settings];
        Setting::updateOrCreate(['key' => self::KEY], ['value' => $merged]);
        Cache::forget(self::CACHE_KEY);

        return self::all();
    }

    /**
     * Switched on in Settings and backed by a driver that can collect money.
     */
    public static function paymentMethodEnabled(string $method): bool
    {
        return (bool) (self::all()['paymentMethods'][$method] ?? false) && self::hasUsableDriver($method);
    }

    private static function hasUsableDriver(string $method): bool
    {
        if ($method === 'cod' || config('payments.allow_sandbox')) {
            return true;
        }

        $driver = $method === 'card' ? config('payments.card_driver') : config('payments.mobile_money_driver');

        return $driver !== 'sandbox';
    }

    /**
     * The subset the storefront may read without signing in.
     *
     * @return array<string, mixed>
     */
    public static function public(): array
    {
        $all = self::all();
        $all['paymentMethods'] = collect($all['paymentMethods'])->map(fn (bool $on, string $method): bool => $on && self::hasUsableDriver($method))->all();

        return collect($all)->only([
            'storeName', 'email', 'phone', 'whatsapp', 'address', 'currency', 'vatRate',
            'pricesIncludeVat', 'defaultLocale', 'paymentMethods', 'maintenanceMode',
        ])->all();
    }
}
