<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Staff;
use App\Support\Permissions;
use Illuminate\Database\Seeder;

/**
 * The single Super Admin. Email and password come from ADMIN_EMAIL /
 * ADMIN_PASSWORD; outside production the password defaults to Admin@123.
 */
class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = mb_strtolower((string) config('app.admin_email'));
        $password = config('app.admin_password') ?: (app()->isProduction() ? null : 'Admin@123');

        if (! $email || ! $password) {
            $this->command?->warn('No ADMIN_EMAIL / ADMIN_PASSWORD set: skipped the Super Admin. Run `php artisan app:create-admin`.');

            return;
        }

        $admin = Staff::query()->updateOrCreate(['email' => $email], [
            'name' => 'Super Admin',
            'password' => $password,
            'status' => 'active',
        ]);
        $admin->syncRoles([Role::findOrFail(Permissions::SUPER_ADMIN_ID)]);

        $this->command?->info("Super Admin: {$email}");
    }
}
