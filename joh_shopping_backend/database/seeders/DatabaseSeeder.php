<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Default: roles/permissions, the store setup, the starter catalog (4–5
     * products per category and the storefront banners) and only the Super
     * Admin: a clean store for testing every flow yourself.
     *
     * SEED_DEMO_DATA=true loads the full demo instead (customers, staff, 260 orders…).
     */
    public function run(): void
    {
        $this->call(RolesAndPermissionsSeeder::class);

        if (config('app.seed_demo_data')) {
            $this->call(DemoDataSeeder::class);
        } else {
            $this->callWith(DemoDataSeeder::class, ['storeOnly' => true]);
            $this->call(StoreCatalogSeeder::class);
        }

        $this->call(SuperAdminSeeder::class);
    }
}
