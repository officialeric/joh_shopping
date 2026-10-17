<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Catalog: categories, brands, products + variants, attributes, reviews, Q&A, stock alerts.
     * Bilingual fields are JSON `{ "sw": …, "en": … }`.
     */
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('slug')->unique();
            $table->json('name');
            $table->json('description')->nullable();
            $table->string('parent_id', 40)->nullable()->index();
            $table->string('icon', 40)->default('smartphone');
            $table->string('art', 20)->default('phone');
            $table->boolean('active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('brands', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('country')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('brand_id', 40)->index();
            $table->string('category_id', 40)->index();
            $table->string('condition', 8)->default('new');
            $table->char('grade', 1)->nullable();
            $table->unsignedTinyInteger('battery_health')->nullable();
            $table->json('short_description');
            $table->json('description');
            $table->json('highlights');
            $table->json('in_box');
            $table->unsignedBigInteger('price')->default(0)->index();
            $table->unsignedBigInteger('compare_at_price')->nullable();
            $table->json('colors');
            $table->json('storages');
            $table->json('rams');
            $table->json('specs');
            $table->decimal('rating', 2, 1)->default(0);
            $table->unsignedInteger('review_count')->default(0);
            $table->unsignedInteger('sold')->default(0);
            $table->unsignedSmallInteger('warranty_months')->default(12);
            $table->json('tags');
            $table->json('images');
            $table->json('art');
            $table->json('compatible_with');
            $table->string('status', 12)->default('draft')->index();
            $table->unsignedInteger('low_stock_threshold')->default(5);
            $table->json('seo');
            $table->string('search_colors')->default('');
            $table->timestamps();

            $table->foreign('brand_id')->references('id')->on('brands')->restrictOnDelete();
            $table->foreign('category_id')->references('id')->on('categories')->restrictOnDelete();
        });

        Schema::create('product_variants', function (Blueprint $table) {
            $table->string('id', 60)->primary();
            $table->string('product_id', 40)->index();
            $table->string('sku')->unique();
            $table->string('color', 9);
            $table->string('storage', 10)->nullable();
            $table->string('ram', 10)->nullable();
            $table->unsignedBigInteger('price');
            $table->unsignedBigInteger('compare_at_price')->nullable();
            $table->integer('stock')->default(0);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
        });

        Schema::create('attribute_values', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('type', 10)->index();
            $table->string('value');
            $table->json('label')->nullable();
            $table->string('hex', 9)->nullable();
            $table->timestamps();
        });

        Schema::create('reviews', function (Blueprint $table) {
            $table->string('id', 60)->primary();
            $table->string('product_id', 40)->index();
            $table->string('user_id', 40)->nullable()->index();
            $table->string('customer_name');
            $table->unsignedTinyInteger('rating');
            $table->string('title');
            $table->text('body');
            $table->boolean('verified')->default(false);
            $table->unsignedInteger('helpful')->default(0);
            $table->string('status', 10)->default('pending')->index();
            $table->text('reply')->nullable();
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('product_questions', function (Blueprint $table) {
            $table->string('id', 60)->primary();
            $table->string('product_id', 40)->index();
            $table->string('user_id', 40)->nullable();
            $table->text('question');
            $table->text('answer')->nullable();
            $table->string('asked_by');
            $table->boolean('published')->default(true);
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('stock_alerts', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('product_id', 40)->index();
            $table->string('email');
            $table->timestamp('notified_at')->nullable();
            $table->timestamps();

            $table->unique(['product_id', 'email']);
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
        });

        Schema::create('wishlist_items', function (Blueprint $table) {
            $table->id();
            $table->string('user_id', 40);
            $table->string('product_id', 40);
            $table->timestamps();

            $table->unique(['user_id', 'product_id']);
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wishlist_items');
        Schema::dropIfExists('stock_alerts');
        Schema::dropIfExists('product_questions');
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('attribute_values');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('products');
        Schema::dropIfExists('brands');
        Schema::dropIfExists('categories');
    }
};
