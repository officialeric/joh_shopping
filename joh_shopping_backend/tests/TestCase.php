<?php

namespace Tests;

use App\Models\Coupon;
use App\Models\PickupStore;
use App\Models\ShippingZone;
use App\Models\Staff;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Send requests as the Next.js SPA so Sanctum starts a session.
     */
    protected function fromSpa(): static
    {
        return $this->withHeaders([
            'Origin' => 'http://localhost:3000',
            'Referer' => 'http://localhost:3000/',
        ]);
    }

    protected function staff(string $roleId = 'role-super'): Staff
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        return Staff::factory()->role($roleId)->create();
    }

    protected function seedShipping(): void
    {
        ShippingZone::create([
            'id' => 'zn-dar',
            'name' => 'Dar es Salaam',
            'regions' => ['Dar es Salaam'],
            'standard_fee' => 5_000,
            'express_fee' => 10_000,
            'free_above' => 300_000,
            'standard_days' => '1',
            'express_days' => '0',
            'active' => true,
        ]);

        PickupStore::create([
            'id' => 's-kariakoo',
            'name' => 'Joh Shopping Kariakoo',
            'region' => 'Dar es Salaam',
            'address' => 'Kariakoo',
            'phone' => '+255712000101',
            'hours' => ['sw' => 'Kila siku', 'en' => 'Daily'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    protected function coupon(array $overrides = []): Coupon
    {
        return Coupon::create([
            'code' => 'KARIBU10',
            'type' => 'percent',
            'value' => 10,
            'min_spend' => 0,
            'max_discount' => null,
            'usage_limit' => 100,
            'used' => 0,
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDay(),
            'active' => true,
            'description' => ['sw' => 'Punguzo', 'en' => 'Discount'],
            ...$overrides,
        ]);
    }
}
