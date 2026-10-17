<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Back office: inventory, IMEIs, content, inbox, settings, activity log, notifications.
     */
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('product_id', 40)->nullable()->index();
            $table->string('variant_id', 60)->nullable();
            $table->string('product_name');
            $table->string('variant_label');
            $table->string('type', 12);
            $table->integer('qty');
            $table->string('reason');
            $table->string('by');
            $table->string('staff_id', 40)->nullable();
            $table->timestamps();

            $table->index('created_at');
            $table->foreign('product_id')->references('id')->on('products')->nullOnDelete();
        });

        Schema::create('serials', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('imei', 20)->unique();
            $table->string('product_id', 40)->nullable()->index();
            $table->string('product_name');
            $table->string('variant_label');
            $table->string('status', 12)->default('in_stock')->index();
            $table->string('order_id', 40)->nullable();
            $table->string('order_number', 30)->nullable();
            $table->string('customer_name')->nullable();
            $table->timestamp('sold_at')->nullable();
            $table->timestamp('warranty_until')->nullable();
            $table->timestamp('received_at');
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->nullOnDelete();
        });

        Schema::create('banners', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->json('title');
            $table->json('subtitle');
            $table->json('cta');
            $table->string('href');
            $table->string('product_id', 40)->nullable();
            $table->string('image')->nullable();
            $table->string('placement', 10)->default('hero');
            $table->string('theme', 10)->default('red');
            $table->boolean('active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('pages', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('slug')->unique();
            $table->json('title');
            $table->json('body');
            $table->boolean('published')->default(true);
            $table->timestamps();
        });

        Schema::create('contact_messages', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('name');
            $table->string('email');
            $table->string('phone', 20)->nullable();
            $table->string('subject');
            $table->text('message');
            $table->string('status', 10)->default('new')->index();
            $table->text('reply')->nullable();
            $table->timestamp('replied_at')->nullable();
            $table->timestamps();
        });

        Schema::create('subscribers', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('email')->unique();
            $table->string('source', 10)->default('footer');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('staff_id', 40)->nullable()->index();
            $table->string('actor');
            $table->string('action');
            $table->string('subject');
            $table->text('meta')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamps();

            $table->index('created_at');
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->string('key', 40)->primary();
            $table->json('value');
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->string('type');
            $table->string('notifiable_type');
            $table->string('notifiable_id', 40);
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['notifiable_type', 'notifiable_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('settings');
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('subscribers');
        Schema::dropIfExists('contact_messages');
        Schema::dropIfExists('pages');
        Schema::dropIfExists('banners');
        Schema::dropIfExists('serials');
        Schema::dropIfExists('stock_movements');
    }
};
