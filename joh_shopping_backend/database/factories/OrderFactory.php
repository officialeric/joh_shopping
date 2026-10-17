<?php

namespace Database\Factories;

use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * A bare order (no lines). Use CheckoutService in tests that need stock effects.
 *
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'number' => 'JOH-'.fake()->unique()->numberBetween(90000, 99999),
            'user_id' => null,
            'customer_name' => fake()->name(),
            'customer_email' => fake()->safeEmail(),
            'customer_phone' => '+255712345678',
            'subtotal' => 100_000,
            'discount' => 0,
            'shipping_fee' => 5_000,
            'total' => 105_000,
            'status' => 'delivered',
            'payment_status' => 'paid',
            'payment_method' => 'mpesa',
            'delivery_method' => 'standard',
            'address' => ['fullName' => 'Test', 'phone' => '+255712345678', 'region' => 'Dar es Salaam', 'district' => 'Ilala', 'street' => 'Samora Ave'],
            'region' => 'Dar es Salaam',
            'locale' => 'sw',
        ];
    }
}
