<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_listing_hides_drafts_and_filters_like_the_storefront(): void
    {
        $samsung = Brand::factory()->create(['slug' => 'samsung']);
        Product::factory()->create(['name' => 'Galaxy A16', 'brand_id' => $samsung->id, 'price' => 300_000]);
        Product::factory()->create(['name' => 'Galaxy S25', 'brand_id' => $samsung->id, 'price' => 3_000_000, 'compare_at_price' => 3_200_000]);
        Product::factory()->create(['name' => 'Other Phone', 'price' => 500_000, 'condition' => 'used', 'colors' => [['name' => ['sw' => 'Bluu', 'en' => 'Blue'], 'hex' => '#0000ff']]]);
        Product::factory()->draft()->create(['name' => 'Secret']);

        $this->getJson('/api/products')->assertOk()->assertJsonCount(3, 'data')->assertJsonPath('meta.total', 3);
        $this->getJson('/api/products?brand[]=samsung&sort=price-desc')->assertJsonPath('data.0.name', 'Galaxy S25')->assertJsonCount(2, 'data');
        $this->getJson('/api/products?deals=1')->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Galaxy S25');
        $this->getJson('/api/products?condition[]=used')->assertJsonCount(1, 'data');
        $this->getJson('/api/products?color[]=blue')->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Other Phone');
        $this->getJson('/api/products?q=galaxy&maxPrice=1000000')->assertJsonCount(1, 'data');
    }

    public function test_bootstrap_returns_everything_the_storefront_renders(): void
    {
        Product::factory()->create();
        Product::factory()->draft()->create();

        $this->getJson('/api/bootstrap')
            ->assertOk()
            ->assertJsonCount(1, 'data.products')
            ->assertJsonStructure(['data' => ['products', 'categories', 'brands', 'zones', 'stores', 'regions', 'settings' => ['paymentMethods'], 'flashSale', 'banners', 'pages']]);
    }

    public function test_product_page_returns_variants_and_hides_drafts(): void
    {
        $product = Product::factory()->create(['slug' => 'galaxy-a16']);
        Product::factory()->draft()->create(['slug' => 'secret']);

        $this->getJson('/api/products/galaxy-a16')
            ->assertOk()
            ->assertJsonPath('data.id', $product->id)
            ->assertJsonPath('data.variants.0.stock', 10)
            ->assertJsonStructure(['data', 'brand', 'category', 'related', 'compatible', 'boughtTogether']);
        $this->getJson('/api/products/secret')->assertNotFound()->assertJsonPath('message', 'not_found');
    }

    public function test_reviews_are_moderated_and_verified_by_purchase(): void
    {
        $product = Product::factory()->create();
        $user = User::factory()->create();

        $this->postJson("/api/products/{$product->id}/reviews", ['rating' => 5, 'title' => 'Nzuri', 'body' => 'Sana'])->assertUnauthorized();

        $this->actingAs($user)->postJson("/api/products/{$product->id}/reviews", ['rating' => 5, 'title' => 'Nzuri', 'body' => 'Sana'])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.verified', false);
        $this->actingAs($user)->postJson("/api/products/{$product->id}/reviews", ['rating' => 4, 'title' => 'Tena', 'body' => 'Tena'])
            ->assertJsonPath('errors.product.0', 'already_reviewed');

        $this->getJson("/api/products/{$product->id}/reviews")->assertJsonCount(0, 'data');
    }

    public function test_contact_newsletter_and_stock_alerts_are_stored(): void
    {
        $product = Product::factory()->create();

        $this->postJson('/api/contact', ['name' => 'Fatma', 'email' => 'f@example.co.tz', 'phone' => '0777000111', 'subject' => 'Pemba', 'message' => 'Mnasafirisha Pemba?'])->assertCreated();
        $this->postJson('/api/newsletter', ['email' => 'F@Example.co.tz'])->assertCreated();
        $this->postJson('/api/newsletter', ['email' => 'f@example.co.tz'])->assertCreated();
        $this->postJson("/api/products/{$product->id}/stock-alerts", ['email' => 'f@example.co.tz'])->assertCreated();

        $this->assertDatabaseHas('contact_messages', ['phone' => '+255777000111', 'status' => 'new']);
        $this->assertDatabaseCount('subscribers', 1);
        $this->assertDatabaseHas('stock_alerts', ['product_id' => $product->id]);
    }
}
