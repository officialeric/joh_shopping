<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Support\Permissions;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

/**
 * Permissions (mirroring the frontend's Permission keys) and the default roles.
 * Safe to re-run: existing roles keep their custom permission sets.
 */
class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * @var list<array{id: string, name: string, description: array{sw: string, en: string}, system: bool, permissions: list<string>}>
     */
    public const ROLES = [
        [
            'id' => 'role-super',
            'name' => 'Super Admin',
            'description' => ['sw' => 'Ufikiaji kamili wa mfumo wote', 'en' => 'Full access to everything'],
            'system' => true,
            'permissions' => Permissions::ALL,
        ],
        [
            'id' => 'role-manager',
            'name' => 'Store Manager',
            'description' => ['sw' => 'Anasimamia shughuli za kila siku za duka', 'en' => 'Runs day-to-day store operations'],
            'system' => false,
            'permissions' => [
                'dashboard.view', 'products.manage', 'categories.manage', 'inventory.manage', 'orders.view', 'orders.manage',
                'payments.view', 'payments.refund', 'returns.manage', 'customers.manage', 'promotions.manage', 'reviews.manage',
                'content.manage', 'shipping.manage', 'messages.manage', 'reports.view',
            ],
        ],
        [
            'id' => 'role-sales',
            'name' => 'Sales',
            'description' => ['sw' => 'Anashughulikia oda na wateja', 'en' => 'Handles orders and customers'],
            'system' => false,
            'permissions' => ['dashboard.view', 'orders.view', 'orders.manage', 'customers.manage', 'payments.view', 'messages.manage'],
        ],
        [
            'id' => 'role-inventory',
            'name' => 'Inventory Officer',
            'description' => ['sw' => 'Anasimamia stoo, bidhaa na IMEI', 'en' => 'Manages stock, products and IMEIs'],
            'system' => false,
            'permissions' => ['dashboard.view', 'products.manage', 'categories.manage', 'inventory.manage', 'orders.view'],
        ],
        [
            'id' => 'role-support',
            'name' => 'Customer Support',
            'description' => ['sw' => 'Anajibu wateja, marejesho na maoni', 'en' => 'Handles customers, returns and reviews'],
            'system' => false,
            'permissions' => ['dashboard.view', 'orders.view', 'returns.manage', 'customers.manage', 'reviews.manage', 'messages.manage'],
        ],
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (Permissions::ALL as $name) {
            Permission::findOrCreate($name, 'admin');
        }

        foreach (self::ROLES as $definition) {
            $role = Role::query()->find($definition['id']);
            if ($role) {
                if ($role->system) {
                    $role->syncPermissions($definition['permissions']);
                }

                continue;
            }

            $role = Role::create([
                'id' => $definition['id'],
                'name' => $definition['name'],
                'guard_name' => 'admin',
                'description' => $definition['description'],
                'system' => $definition['system'],
            ]);
            $role->syncPermissions($definition['permissions']);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
