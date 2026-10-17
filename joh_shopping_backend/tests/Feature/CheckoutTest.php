<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Notifications\OrderPlaced;
use App\Support\StoreSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedShipping();
        Notification::fake();
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(Product $product, int $qty = 1, array $overrides = []): array
    {
        return [
            'contact' => ['name' => 'Neema Said', 'email' => 'neema@example.co.tz', 'phone' => '0754 123 456'],
            'delivery' => 'standard',
            'address' => ['fullName' => 'Neema Said', 'phone' => '0754123456', 'region' => 'Dar es Salaam', 'district' => 'Ilala', 'street' => 'Samora Ave'],
            'paymentMethod' => 'mpesa',
            'payerPhone' => '0754123456',
            'lines' => [['productId' => $product->id, 'variantId' => "{$product->id}-v0", 'qty' => $qty]],
            ...$overrides,
        ];
    }

    public function test_guest_checkout_creates_a_paid_order_and_reserves_stock(): void
    {
        $product = Product::factory()->create(['price' => 100_000]);

        $response = $this->fromSpa()->postJson('/api/orders', $this->payload($product, 2));

        $response->assertCreated()
            ->assertJsonPath('data.customerId', 'guest')
            ->assertJsonPath('data.customerPhone', '+255754123456')
            ->assertJsonPath('data.subtotal', 200_000)
            ->assertJsonPath('data.shippingFee', 5_000)
            ->assertJsonPath('data.total', 205_000)
            ->assertJsonPath('data.status', 'confirmed')
            ->assertJsonPath('data.paymentStatus', 'paid')
            ->assertJsonPath('payment.status', 'paid');

        $this->assertSame(8, $product->variants()->first()->stock);
        $this->assertSame(2, $product->fresh()->sold);
        $this->assertDatabaseHas('stock_movements', ['variant_id' => "{$product->id}-v0", 'type' => 'out', 'qty' => -2]);
        Notification::assertSentOnDemand(OrderPlaced::class);
    }

    public function test_prices_come_from_the_server_not_the_client(): void
    {
        $product = Product::factory()->create(['price' => 100_000]);

        $this->postJson('/api/orders', [...$this->payload($product), 'total' => 1, 'price' => 1])
            ->assertCreated()
            ->assertJsonPath('data.items.0.price', 100_000);
    }

    public function test_coupon_and_free_shipping_threshold_are_applied(): void
    {
        $product = Product::factory()->create(['price' => 400_000]);
        $coupon = $this->coupon();

        $this->postJson('/api/orders', $this->payload($product, 1, ['couponCode' => 'karibu10']))
            ->assertCreated()
            ->assertJsonPath('data.discount', 40_000)
            ->assertJsonPath('data.shippingFee', 0)
            ->assertJsonPath('data.total', 360_000)
            ->assertJsonPath('data.couponCode', 'KARIBU10');

        $this->assertSame(1, $coupon->fresh()->used);
    }

    public function test_invalid_coupon_blocks_the_order(): void
    {
        $product = Product::factory()->create();

        $this->postJson('/api/orders', $this->payload($product, 1, ['couponCode' => 'NOPE']))
            ->assertUnprocessable()
            ->assertJsonPath('errors.couponCode.0', 'invalid');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_cannot_buy_more_than_is_in_stock(): void
    {
        $product = Product::factory()->create();

        $this->postJson('/api/orders', $this->payload($product, 11))
            ->assertUnprocessable()
            ->assertJsonPath('errors', ['lines.0.qty' => ['out_of_stock']]);

        $this->assertSame(10, $product->variants()->first()->stock);
    }

    public function test_draft_products_cannot_be_ordered(): void
    {
        $product = Product::factory()->draft()->create();

        $this->postJson('/api/orders', $this->payload($product))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('lines.0');
    }

    public function test_cash_on_delivery_is_off_by_default_and_pending_when_on(): void
    {
        $product = Product::factory()->create();

        $this->postJson('/api/orders', $this->payload($product, 1, ['paymentMethod' => 'cod', 'payerPhone' => null]))
            ->assertUnprocessable()
            ->assertJsonPath('errors.paymentMethod.0', 'payment_method_unavailable');

        StoreSettings::save(['paymentMethods' => [...StoreSettings::get('paymentMethods'), 'cod' => true]]);

        $this->postJson('/api/orders', $this->payload($product, 1, ['paymentMethod' => 'cod', 'payerPhone' => null]))
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.paymentStatus', 'pending');
    }

    public function test_mobile_money_needs_a_payer_phone(): void
    {
        $product = Product::factory()->create();

        $this->postJson('/api/orders', $this->payload($product, 1, ['payerPhone' => null]))
            ->assertJsonValidationErrors('payerPhone');
    }

    public function test_pickup_needs_no_address_and_is_free(): void
    {
        $product = Product::factory()->create(['price' => 50_000]);

        $this->postJson('/api/orders', $this->payload($product, 1, ['delivery' => 'pickup', 'address' => null, 'pickupStoreId' => 's-kariakoo']))
            ->assertCreated()
            ->assertJsonPath('data.shippingFee', 0)
            ->assertJsonPath('data.pickupStoreId', 's-kariakoo')
            ->assertJsonMissingPath('data.address');
    }

    public function test_signed_in_customer_orders_update_their_totals(): void
    {
        $user = User::factory()->create(['orders_count' => 0, 'total_spent' => 0]);
        $product = Product::factory()->create(['price' => 100_000]);

        $this->actingAs($user)->postJson('/api/orders', $this->payload($product))
            ->assertCreated()
            ->assertJsonPath('data.customerId', $user->id);

        $user->refresh();
        $this->assertSame(1, $user->orders_count);
        $this->assertSame(105_000, $user->total_spent);
    }

    public function test_confirmation_page_is_limited_to_the_session_that_placed_the_order(): void
    {
        $product = Product::factory()->create();
        $number = $this->fromSpa()->postJson('/api/orders', $this->payload($product))->json('data.number');

        $this->fromSpa()->getJson("/api/orders/lookup/{$number}")->assertOk();

        $this->flushSession();
        $this->app['auth']->forgetGuards();
        $this->getJson("/api/orders/lookup/{$number}")->assertNotFound();
    }

    public function test_guest_tracking_needs_the_matching_email_or_phone(): void
    {
        $order = Order::factory()->create(['number' => 'JOH-77777', 'customer_email' => 'juma@example.co.tz', 'customer_phone' => '+255713000111']);

        $this->postJson('/api/track', ['number' => 'joh-77777', 'contact' => 'JUMA@example.co.tz'])->assertOk()->assertJsonPath('data.id', $order->id);
        $this->postJson('/api/track', ['number' => 'JOH-77777', 'contact' => '0713 000 111'])->assertOk();
        $this->postJson('/api/track', ['number' => 'JOH-77777', 'contact' => 'someone@else.com'])->assertNotFound();
    }

    public function test_quote_matches_checkout_pricing(): void
    {
        $product = Product::factory()->create(['price' => 100_000]);
        $this->coupon(['type' => 'free_shipping', 'value' => 0, 'code' => 'JOHFREE']);

        $this->postJson('/api/cart/quote', [
            'lines' => [['productId' => $product->id, 'variantId' => "{$product->id}-v0", 'qty' => 1]],
            'couponCode' => 'JOHFREE',
            'region' => 'Dar es Salaam',
            'delivery' => 'standard',
        ])->assertOk()
            ->assertJsonPath('data.subtotal', 100_000)
            ->assertJsonPath('data.shipping', 0)
            ->assertJsonPath('data.freeShipping', true)
            ->assertJsonPath('data.total', 100_000);
    }

    public function test_maintenance_mode_pauses_checkout(): void
    {
        StoreSettings::save(['maintenanceMode' => true]);
        $product = Product::factory()->create();

        $this->postJson('/api/orders', $this->payload($product))->assertStatus(503);
    }

    public function test_the_sandbox_cannot_take_payments_on_a_live_store_unless_allowed(): void
    {
        config(['payments.allow_sandbox' => false]);
        StoreSettings::save(['paymentMethods' => [...StoreSettings::all()['paymentMethods'], 'cod' => true]]);
        $product = Product::factory()->create();

        $this->getJson('/api/settings')
            ->assertJsonPath('data.paymentMethods.mpesa', false)
            ->assertJsonPath('data.paymentMethods.card', false)
            ->assertJsonPath('data.paymentMethods.cod', true);

        $this->postJson('/api/orders', $this->payload($product))
            ->assertUnprocessable()
            ->assertJsonPath('errors.paymentMethod.0', 'payment_method_unavailable');
        $this->fromSpa()->postJson('/api/orders', $this->payload($product, 1, ['paymentMethod' => 'cod']))->assertCreated();
    }
}
