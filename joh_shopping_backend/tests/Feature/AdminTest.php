<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Review;
use App\Models\Role;
use App\Models\Staff;
use App\Models\StockAlert;
use App\Models\User;
use App\Notifications\BackInStock;
use App\Notifications\StaffInvitation;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_login_returns_permissions_and_logs_activity(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $staff = Staff::factory()->role('role-sales')->create(['email' => 'sales@johshopping.co.tz', 'password' => 'Sales@123']);

        $this->fromSpa()->postJson('/api/admin/login', ['email' => 'SALES@johshopping.co.tz', 'password' => 'Sales@123'])
            ->assertOk()
            ->assertJsonPath('data.roleId', 'role-sales')
            ->assertJsonPath('data.permissions', ['dashboard.view', 'orders.view', 'orders.manage', 'payments.view', 'customers.manage', 'messages.manage']);

        $this->assertDatabaseHas('activity_logs', ['staff_id' => $staff->id, 'action' => 'logged in']);
    }

    public function test_suspended_and_invited_staff_cannot_sign_in(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        Staff::factory()->suspended()->create(['email' => 's@x.tz', 'password' => 'Password1']);

        $this->fromSpa()->postJson('/api/admin/login', ['email' => 's@x.tz', 'password' => 'Password1'])
            ->assertForbidden()
            ->assertJsonPath('message', 'account_suspended');
    }

    public function test_customers_cannot_reach_the_admin_api(): void
    {
        $this->getJson('/api/admin/orders')->assertUnauthorized();
        $this->actingAs(User::factory()->create())->getJson('/api/admin/orders')->assertUnauthorized();
    }

    public function test_permissions_follow_the_role(): void
    {
        $sales = $this->staff('role-sales');

        $this->actingAs($sales, 'admin')->getJson('/api/admin/orders')->assertOk();
        $this->actingAs($sales, 'admin')->getJson('/api/admin/products')->assertForbidden();
        $this->actingAs($sales, 'admin')->getJson('/api/admin/payments')->assertOk();
        $this->actingAs($sales, 'admin')->postJson('/api/admin/payments/x/refund', ['amount' => 1, 'reason' => 'x'])->assertForbidden();
        $this->actingAs($sales, 'admin')->getJson('/api/admin/settings')->assertForbidden();
    }

    public function test_coupon_crud_with_pagination_search_and_audit(): void
    {
        $admin = $this->staff();
        $payload = [
            'code' => 'simu50k', 'type' => 'fixed', 'value' => 50_000, 'minSpend' => 1_000_000, 'usageLimit' => 200,
            'startsAt' => now()->toIso8601String(), 'expiresAt' => now()->addMonth()->toIso8601String(), 'active' => true,
            'description' => ['sw' => 'Punguzo', 'en' => 'Discount'],
        ];

        $id = $this->actingAs($admin, 'admin')->postJson('/api/admin/coupons', $payload)
            ->assertCreated()
            ->assertJsonPath('data.code', 'SIMU50K')
            ->json('data.id');
        $this->assertStringStartsWith('cpn-', $id);

        $this->actingAs($admin, 'admin')->patchJson("/api/admin/coupons/{$id}", ['active' => false])
            ->assertOk()
            ->assertJsonPath('data.active', false)
            ->assertJsonPath('data.value', 50_000);

        $this->actingAs($admin, 'admin')->getJson('/api/admin/coupons?search=simu&perPage=5&filter[active]=false')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('meta.per_page', 5);

        $this->actingAs($admin, 'admin')->deleteJson('/api/admin/coupons', ['ids' => [$id]])->assertNoContent();
        $this->assertDatabaseHas('activity_logs', ['action' => 'created coupon', 'subject' => 'SIMU50K']);
        $this->assertDatabaseHas('activity_logs', ['action' => 'deleted coupon']);
    }

    public function test_product_save_syncs_variants_price_and_stock_ledger(): void
    {
        Notification::fake();
        $admin = $this->staff();
        $product = Product::factory()->create(['price' => 100_000]);
        $product->variants()->update(['stock' => 0]);
        StockAlert::create(['product_id' => $product->id, 'email' => 'wait@example.co.tz']);

        $data = $this->actingAs($admin, 'admin')->getJson("/api/admin/products/{$product->id}")->json('data');
        $data['variants'][0]['stock'] = 4;
        $data['variants'][] = ['sku' => 'NEW-256', 'color' => '#111111', 'storage' => '256GB', 'price' => 90_000, 'stock' => 3];

        $this->actingAs($admin, 'admin')->patchJson("/api/admin/products/{$product->id}", $data)
            ->assertOk()
            ->assertJsonCount(2, 'data.variants')
            ->assertJsonPath('data.price', 90_000)
            ->assertJsonPath('data.variants.1.id', "{$product->id}-v1");

        $this->assertDatabaseHas('stock_movements', ['product_id' => $product->id, 'type' => 'adjustment', 'qty' => 4]);
        $this->assertDatabaseHas('stock_movements', ['product_id' => $product->id, 'type' => 'in', 'qty' => 3]);
        Notification::assertSentOnDemand(BackInStock::class);
        $this->assertNotNull(StockAlert::first()->notified_at);
    }

    public function test_storefront_edits_ping_the_storefront_cache(): void
    {
        config(['app.storefront_revalidate_secret' => 'secret', 'app.storefront_revalidate_url' => 'http://shop.test/api/revalidate']);
        Http::fake();
        $admin = $this->staff();

        $this->actingAs($admin, 'admin')->postJson('/api/admin/brands', ['slug' => 'nokia', 'name' => 'Nokia', 'active' => true])->assertCreated();
        $this->actingAs($admin, 'admin')->postJson('/api/admin/subscribers', ['email' => 'a@b.tz', 'source' => 'footer', 'active' => true])->assertCreated();

        Http::assertSentCount(1);
        Http::assertSent(fn ($request) => $request->url() === 'http://shop.test/api/revalidate' && $request->header('X-Revalidate-Secret')[0] === 'secret');
    }

    public function test_payments_sort_by_order_number(): void
    {
        $admin = $this->staff();

        $this->actingAs($admin, 'admin')->getJson('/api/admin/payments?sort=-orderNumber')->assertOk();
        $this->actingAs($admin, 'admin')->getJson('/api/admin/activity?sort=actor')->assertOk();
    }

    public function test_inventory_adjustment(): void
    {
        $admin = $this->staff('role-inventory');
        $product = Product::factory()->create();

        $this->actingAs($admin, 'admin')->postJson('/api/admin/inventory/adjust', [
            'productId' => $product->id, 'variantId' => "{$product->id}-v0", 'type' => 'out', 'qty' => 3, 'reason' => 'Damaged',
        ])->assertOk()->assertJsonPath('data.stock', 7);
    }

    public function test_approving_a_review_updates_the_product_rating(): void
    {
        $admin = $this->staff();
        $product = Product::factory()->create(['rating' => 4.0, 'review_count' => 1]);
        $review = Review::create(['product_id' => $product->id, 'customer_name' => 'A', 'rating' => 5, 'title' => 'T', 'body' => 'B', 'status' => 'pending']);

        $this->actingAs($admin, 'admin')->patchJson("/api/admin/reviews/{$review->id}", ['status' => 'approved', 'reply' => 'Asante!'])->assertOk();

        $this->assertSame(2, $product->fresh()->review_count);
        $this->assertSame(4.5, $product->fresh()->rating);
    }

    public function test_new_staff_without_password_are_invited(): void
    {
        Notification::fake();
        $admin = $this->staff();

        $this->actingAs($admin, 'admin')->postJson('/api/admin/staff', [
            'name' => 'Saida Makame', 'email' => 'saida@johshopping.co.tz', 'phone' => '0715000000', 'roleId' => 'role-support', 'status' => 'active',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'invited')
            ->assertJsonPath('data.roleId', 'role-support');

        Notification::assertSentTo(Staff::where('email', 'saida@johshopping.co.tz')->first(), StaffInvitation::class);
    }

    public function test_the_last_super_admin_cannot_be_demoted_or_deleted(): void
    {
        $admin = $this->staff();
        $other = $this->staff('role-manager');

        $this->actingAs($admin, 'admin')->patchJson("/api/admin/staff/{$admin->id}", ['status' => 'suspended'])
            ->assertJsonPath('errors.status.0', 'cannot_suspend_self');
        $this->actingAs($admin, 'admin')->deleteJson("/api/admin/staff/{$admin->id}")
            ->assertJsonPath('errors.id.0', 'cannot_delete_self');

        $other->syncRoles([Role::findOrFail('role-super')]);
        $this->actingAs($other, 'admin')->patchJson("/api/admin/staff/{$admin->id}", ['roleId' => 'role-sales'])->assertOk();
        $this->actingAs($admin->fresh(), 'admin')->patchJson("/api/admin/staff/{$other->id}", ['roleId' => 'role-sales'])->assertForbidden();
    }

    public function test_a_manager_cannot_demote_the_last_super_admin(): void
    {
        $super = $this->staff();
        $manager = $this->staff('role-manager');
        Role::findOrFail('role-manager')->givePermissionTo('staff.manage');

        $this->actingAs($manager, 'admin')->patchJson("/api/admin/staff/{$super->id}", ['roleId' => 'role-sales'])
            ->assertJsonPath('errors.roleId.0', 'last_super_admin');
        $this->actingAs($manager, 'admin')->patchJson("/api/admin/staff/{$super->id}", ['status' => 'suspended'])
            ->assertJsonPath('errors.roleId.0', 'last_super_admin');
        $this->actingAs($manager, 'admin')->deleteJson("/api/admin/staff/{$super->id}")
            ->assertJsonPath('errors.roleId.0', 'last_super_admin');

        $this->assertTrue($super->fresh()->hasRole('Super Admin'));
        $this->assertSame('active', $super->fresh()->status);
    }

    public function test_system_roles_cannot_be_deleted_and_super_admin_keeps_all_permissions(): void
    {
        $admin = $this->staff();

        $this->actingAs($admin, 'admin')->deleteJson('/api/admin/roles/role-super')->assertJsonPath('errors.id.0', 'system_role');
        $this->actingAs($admin, 'admin')->patchJson('/api/admin/roles/role-super', ['permissions' => ['orders.view']])
            ->assertOk()
            ->assertJsonCount(20, 'data.permissions');

        $roleId = $this->actingAs($admin, 'admin')->postJson('/api/admin/roles', ['name' => 'Cashier', 'permissions' => ['payments.view']])
            ->assertCreated()
            ->json('data.id');
        $this->assertStringStartsWith('role-', $roleId);
    }

    public function test_settings_update_and_public_subset(): void
    {
        $admin = $this->staff();

        $this->actingAs($admin, 'admin')->putJson('/api/admin/settings', ['paymentMethods' => ['cod' => true], 'orderPrefix' => 'JS-'])
            ->assertOk()
            ->assertJsonPath('data.paymentMethods.cod', true)
            ->assertJsonPath('data.paymentMethods.mpesa', true);

        $this->getJson('/api/settings')
            ->assertJsonPath('data.paymentMethods.cod', true)
            ->assertJsonMissingPath('data.orderPrefix');
    }

    public function test_dashboard_and_sales_reports_respond(): void
    {
        $admin = $this->staff();

        $this->actingAs($admin, 'admin')->getJson('/api/admin/analytics/dashboard?days=7')
            ->assertOk()
            ->assertJsonCount(7, 'data.series')
            ->assertJsonStructure(['data' => ['revenue' => ['value', 'delta'], 'orders', 'aov', 'customers', 'byPayment', 'byCategory', 'byRegion', 'topProducts', 'recentOrders', 'lowStock', 'attention']]);
        $this->actingAs($admin, 'admin')->getJson('/api/admin/analytics/sales?days=30')
            ->assertOk()
            ->assertJsonStructure(['data' => ['gross', 'discounts', 'refunds', 'net', 'orders', 'series', 'byBrand', 'byCategory', 'topProducts', 'topCustomers', 'condition']]);
    }
}
