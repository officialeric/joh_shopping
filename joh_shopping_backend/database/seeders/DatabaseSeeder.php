<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Roles/permissions always; demo data outside production (or with SEED_DEMO_DATA=true).
     * In production create the first admin with `php artisan app:create-admin`.
     */
    public function run(): void
    {
        $this->call(RolesAndPermissionsSeeder::class);

        if (! app()->isProduction() || config('app.seed_demo_data')) {
            $this->call(DemoDataSeeder::class);
        }
    }
}
