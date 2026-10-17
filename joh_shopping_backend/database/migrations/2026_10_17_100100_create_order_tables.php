<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sales: coupons, flash sales, shipping, orders, payments, returns, customer extras.
     * Money is whole TZS (no minor units).
     */
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('code', 40)->unique();
            $table->string('type', 16);
            $table->unsignedBigInteger('value')->default(0);
            $table->unsignedBigInteger('min_spend')->default(0);
            $table->unsignedBigInteger('max_discount')->nullable();
            $table->unsignedInteger('usage_limit')->default(0);
            $table->unsignedInteger('used')->default(0);
            $table->timestamp('starts_at');
            $table->timestamp('expires_at');
            $table->boolean('active')->default(true);
            $table->json('description');
            $table->timestamps();
        });

        Schema::create('flash_sales', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->json('name');
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('flash_sale_items', function (Blueprint $table) {
            $table->id();
            $table->string('flash_sale_id', 40);
            $table->string('product_id', 40);
            $table->unsignedBigInteger('sale_price');
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('sold')->default(0);
            $table->timestamps();

            $table->unique(['flash_sale_id', 'product_id']);
            $table->foreign('flash_sale_id')->references('id')->on('flash_sales')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
        });

        Schema::create('shipping_zones', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('name');
            $table->json('regions');
            $table->unsignedBigInteger('standard_fee')->default(0);
            $table->unsignedBigInteger('express_fee')->default(0);
            $table->unsignedBigInteger('free_above')->default(0);
            $table->string('standard_days', 10)->default('1');
            $table->string('express_days', 10)->default('-');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('pickup_stores', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('name');
            $table->string('region');
            $table->string('address');
            $table->string('phone', 30);
            $table->json('hours');
            $table->string('map_url')->nullable();
            $table->timestamps();
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('number', 30)->unique();
            $table->string('user_id', 40)->nullable()->index();
            $table->string('customer_name');
            $table->string('customer_email')->index();
            $table->string('customer_phone', 20);
            $table->unsignedBigInteger('subtotal');
            $table->unsignedBigInteger('discount')->default(0);
            $table->unsignedBigInteger('shipping_fee')->default(0);
            $table->unsignedBigInteger('total');
            $table->string('coupon_code', 40)->nullable();
            $table->string('status', 20)->default('pending')->index();
            $table->string('payment_status', 20)->default('pending')->index();
            $table->string('payment_method', 12);
            $table->string('delivery_method', 10);
            $table->json('address')->nullable();
            $table->string('region')->nullable()->index();
            $table->string('pickup_store_id', 40)->nullable();
            $table->json('courier')->nullable();
            $table->text('notes')->nullable();
            $table->string('locale', 2)->default('sw');
            $table->timestamps();

            $table->index('created_at');
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->string('order_id', 40)->index();
            $table->string('product_id', 40)->nullable()->index();
            $table->string('variant_id', 60)->nullable();
            $table->string('name');
            $table->string('variant_label');
            $table->unsignedBigInteger('price');
            $table->unsignedInteger('qty');
            $table->json('imei')->nullable();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->nullOnDelete();
            $table->foreign('variant_id')->references('id')->on('product_variants')->nullOnDelete();
        });

        Schema::create('order_events', function (Blueprint $table) {
            $table->id();
            $table->string('order_id', 40)->index();
            $table->string('status', 20);
            $table->text('note')->nullable();
            $table->string('by')->nullable();
            $table->timestamp('at');

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('reference', 40)->unique();
            $table->string('order_id', 40)->index();
            $table->string('method', 12)->index();
            $table->string('gateway', 20)->default('sandbox');
            $table->string('gateway_reference')->nullable()->index();
            $table->unsignedBigInteger('amount');
            $table->unsignedBigInteger('refunded')->default(0);
            $table->string('status', 20)->default('pending')->index();
            $table->string('payer_phone', 20)->nullable();
            $table->string('card_last4', 4)->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
        });

        Schema::create('return_requests', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('number', 30)->unique();
            $table->string('type', 10);
            $table->string('order_id', 40)->index();
            $table->string('user_id', 40)->nullable()->index();
            $table->string('customer_name');
            $table->string('product_name');
            $table->string('imei', 20)->nullable();
            $table->string('reason');
            $table->text('details');
            $table->string('status', 12)->default('requested')->index();
            $table->string('resolution', 12)->nullable();
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('addresses', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('user_id', 40)->index();
            $table->string('label');
            $table->string('full_name');
            $table->string('phone', 20);
            $table->string('region');
            $table->string('district');
            $table->string('street');
            $table->string('landmark')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('saved_payment_methods', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('user_id', 40)->index();
            $table->string('method', 12);
            $table->string('label');
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('counters', function (Blueprint $table) {
            $table->string('name', 30)->primary();
            $table->unsignedBigInteger('value')->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('counters');
        Schema::dropIfExists('saved_payment_methods');
        Schema::dropIfExists('addresses');
        Schema::dropIfExists('return_requests');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('order_events');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('pickup_stores');
        Schema::dropIfExists('shipping_zones');
        Schema::dropIfExists('flash_sale_items');
        Schema::dropIfExists('flash_sales');
        Schema::dropIfExists('coupons');
    }
};
