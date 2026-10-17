<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\Role;
use App\Models\Staff;
use App\Support\Permissions;
use App\Support\Sequence;
use App\Support\StorefrontCache;
use Database\Seeders\StoreCatalogSeeder;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

#[Signature('app:reset-for-testing
    {--product=p-ip16pm : Id of an extra product to keep besides the starter catalog}
    {--admin-email=support@johshopping.com : Email of the single Super Admin to keep}
    {--admin-password=Admin@123 : Password for that Super Admin}
    {--force : Skip the confirmation (required in production)}')]
#[Description('Empty the store for end-to-end testing: keep settings, roles, categories, brands, shipping, pickup stores, pages and the starter catalog')]
class ResetForTesting extends Command
{
    /**
     * Activity, people and sales data that is wiped completely.
     */
    private const WIPE = [
        'users', 'password_reset_tokens', 'staff_password_reset_tokens', 'sessions', 'personal_access_tokens',
        'orders', 'order_items', 'order_events', 'payments', 'return_requests',
        'addresses', 'saved_payment_methods', 'wishlist_items', 'notifications',
        'reviews', 'product_questions', 'stock_alerts',
        'coupons', 'flash_sales', 'flash_sale_items', 'banners',
        'contact_messages', 'subscribers', 'stock_movements', 'serials', 'activity_logs',
        'jobs', 'failed_jobs', 'job_batches', 'cache', 'cache_locks',
    ];

    public function handle(): int
    {
        $product = Product::find($this->option('product'));
        if (! $product) {
            $this->error("Product [{$this->option('product')}] not found.");

            return self::FAILURE;
        }

        if (app()->isProduction() && ! $this->option('force')) {
            $this->error('Refusing to run in production without --force.');

            return self::FAILURE;
        }
        if (! $this->option('force') && ! $this->confirm('Delete all customers, orders, staff and every product outside the starter catalog?')) {
            return self::FAILURE;
        }

        Schema::disableForeignKeyConstraints();
        try {
            foreach (self::WIPE as $table) {
                if (Schema::hasTable($table)) {
                    DB::table($table)->truncate();
                }
            }

            $keep = [...StoreCatalogSeeder::PRODUCTS, $product->id];
            DB::table('product_variants')->whereNotIn('product_id', $keep)->delete();
            DB::table('products')->whereNotIn('id', $keep)->delete();
            DB::table('products')->update(['sold' => 0, 'rating' => 0, 'review_count' => 0]);

            DB::table('model_has_roles')->delete();
            DB::table('model_has_permissions')->delete();
            DB::table('staff')->delete();
        } finally {
            Schema::enableForeignKeyConstraints();
        }

        $admin = Staff::create([
            'name' => 'Super Admin',
            'email' => mb_strtolower($this->option('admin-email')),
            'password' => $this->option('admin-password'),
            'status' => 'active',
        ]);
        $admin->syncRoles([Role::findOrFail(Permissions::SUPER_ADMIN_ID)]);

        // Brings back any starter product or banner that is missing.
        $this->callSilently('db:seed', ['--class' => StoreCatalogSeeder::class, '--force' => true]);

        // Order and return numbers start again at JOH-10240 / RMA-5100.
        Sequence::set('orders', 10239);
        Sequence::set('returns', 5099);

        Cache::flush();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        StorefrontCache::flush();

        $this->info('Store emptied. Kept: settings, roles, categories, brands, attributes, shipping zones, pickup stores, pages and the starter catalog ('.DB::table('products')->count().' products).');
        $this->info("Admin: {$admin->email} / {$this->option('admin-password')}");

        return self::SUCCESS;
    }
}
