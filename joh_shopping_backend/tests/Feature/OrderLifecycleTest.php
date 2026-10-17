<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\Serial;
use App\Models\User;
use App\Notifications\OrderStatusChanged;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class OrderLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;

    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedShipping();
        Notification::fake();

        $this->customer = User::factory()->create();
        $this->product = Product::factory()->create(['price' => 100_000, 'category_id' => Category::factory()->create(['id' => 'c-phones'])->id]);
    }

    private function placeOrder(): Order
    {
        $id = $this->actingAs($this->customer)->postJson('/api/orders', [
            'contact' => ['name' => $this->customer->name, 'email' => $this->customer->email, 'phone' => '0712345678'],
            'delivery' => 'standard',
            'address' => ['fullName' => 'A', 'phone' => '0712345678', 'region' => 'Dar es Salaam', 'district' => 'Ilala', 'street' => 'X'],
            'paymentMethod' => 'airtel',
            'payerPhone' => '0682000000',
            'lines' => [['productId' => $this->product->id, 'variantId' => "{$this->product->id}-v0", 'qty' => 2]],
        ])->assertCreated()->json('data.id');

        return Order::findOrFail($id);
    }

    public function test_customer_cancel_restocks_refunds_and_reverses_totals(): void
    {
        $order = $this->placeOrder();
        $this->assertSame(8, $this->product->variants()->first()->stock);

        $this->actingAs($this->customer)->postJson("/api/account/orders/{$order->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.paymentStatus', 'refunded');

        $this->assertSame(10, $this->product->variants()->first()->stock);
        $this->assertSame(0, $this->customer->fresh()->orders_count);
        $this->assertDatabaseHas('payments', ['order_id' => $order->id, 'status' => 'refunded', 'refunded' => $order->total]);
        Notification::assertSentTo($this->customer, OrderStatusChanged::class);
    }

    public function test_shipped_orders_cannot_be_cancelled_by_the_customer(): void
    {
        $order = $this->placeOrder();
        $order->update(['status' => 'shipped']);

        $this->actingAs($this->customer)->postJson("/api/account/orders/{$order->id}/cancel")
            ->assertUnprocessable()
            ->assertJsonPath('errors.status.0', 'cannot_cancel');
    }

    public function test_customers_cannot_see_other_customers_orders(): void
    {
        $order = $this->placeOrder();

        $this->app['auth']->forgetGuards();
        $this->actingAs(User::factory()->create())->getJson("/api/account/orders/{$order->id}")->assertNotFound();
        $this->actingAs($this->customer)->getJson("/api/account/orders/{$order->number}")->assertOk();
    }

    public function test_staff_fulfil_an_order_with_imeis_and_warranty_starts_on_delivery(): void
    {
        $order = $this->placeOrder();
        $admin = $this->staff();
        $variantId = "{$this->product->id}-v0";

        $this->actingAs($admin, 'admin')->postJson("/api/admin/orders/{$order->id}/imeis", ['imeis' => [$variantId => ['356789012345678', '356789012345679']]])
            ->assertOk()
            ->assertJsonPath('data.items.0.imei', ['356789012345678', '356789012345679']);

        $this->actingAs($admin, 'admin')->postJson("/api/admin/orders/{$order->id}/courier", ['name' => 'Joh Express', 'trackingNumber' => 'TZ1', 'phone' => '+255712000200'])
            ->assertOk()
            ->assertJsonPath('data.courier.name', 'Joh Express');

        foreach (['packed', 'shipped', 'out_for_delivery', 'delivered'] as $status) {
            $this->actingAs($admin, 'admin')->postJson("/api/admin/orders/{$order->id}/status", ['status' => $status])->assertOk();
        }

        $serial = Serial::where('imei', '356789012345678')->firstOrFail();
        $this->assertSame('sold', $serial->status);
        $this->assertSame($order->number, $serial->order_number);
        $this->assertTrue($serial->warranty_until->isAfter(now()->addMonths(11)));
        $this->assertDatabaseHas('activity_logs', ['action' => 'updated order status', 'subject' => "{$order->number} → delivered"]);
    }

    public function test_an_imei_sold_on_another_order_is_rejected(): void
    {
        $first = $this->placeOrder();
        $second = $this->placeOrder();
        $admin = $this->staff();
        $variantId = "{$this->product->id}-v0";

        $this->actingAs($admin, 'admin')->postJson("/api/admin/orders/{$first->id}/imeis", ['imeis' => [$variantId => ['356789012345678']]])->assertOk();
        $this->actingAs($admin, 'admin')->postJson("/api/admin/orders/{$second->id}/imeis", ['imeis' => [$variantId => ['356789012345678']]])->assertUnprocessable();
    }

    public function test_closed_orders_cannot_be_reopened(): void
    {
        $order = $this->placeOrder();
        $admin = $this->staff();

        $this->actingAs($admin, 'admin')->postJson("/api/admin/orders/{$order->id}/status", ['status' => 'cancelled'])->assertOk();
        $this->actingAs($admin, 'admin')->postJson("/api/admin/orders/{$order->id}/status", ['status' => 'shipped'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.status.0', 'order_closed');
    }

    public function test_partial_and_excessive_refunds(): void
    {
        $order = $this->placeOrder();
        $payment = $order->payments()->firstOrFail();
        $admin = $this->staff();

        $this->actingAs($admin, 'admin')->postJson("/api/admin/payments/{$payment->id}/refund", ['amount' => 5_000, 'reason' => 'Late delivery'])
            ->assertOk()
            ->assertJsonPath('data.status', 'partially_refunded')
            ->assertJsonPath('data.refunded', 5_000);

        $this->actingAs($admin, 'admin')->postJson("/api/admin/payments/{$payment->id}/refund", ['amount' => $order->total, 'reason' => 'Too much'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.amount.0', 'invalid_amount');

        $this->assertSame('partially_refunded', $order->fresh()->payment_status);
    }

    public function test_sandbox_webhook_confirms_a_pending_payment(): void
    {
        config(['payments.drivers.sandbox.autoConfirm' => false]);
        $order = $this->placeOrder();
        $this->assertSame('pending', $order->status);
        $reference = $order->payments()->value('reference');

        $this->getJson("/api/payments/{$reference}/status")->assertJsonPath('data.status', 'pending');
        $this->postJson('/api/payments/webhooks/sandbox', ['reference' => $reference, 'status' => 'paid'])->assertOk();

        $this->getJson("/api/payments/{$reference}/status")
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.orderStatus', 'confirmed');
        $this->postJson('/api/payments/webhooks/nope', ['reference' => $reference, 'status' => 'paid'])->assertNotFound();
    }
}
