<?php

namespace Database\Factories;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * A published product with one black 128GB variant (100 000 TZS, 10 in stock)
 * unless overridden with withVariant().
 *
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(3, true);

        return [
            'slug' => Str::slug($name),
            'name' => Str::title($name),
            'brand_id' => Brand::factory(),
            'category_id' => Category::factory(),
            'condition' => 'new',
            'short_description' => ['sw' => 'Maelezo mafupi', 'en' => 'Short description'],
            'description' => ['sw' => 'Maelezo', 'en' => 'Description'],
            'highlights' => [],
            'in_box' => [],
            'price' => 100_000,
            'compare_at_price' => null,
            'colors' => [['name' => ['sw' => 'Nyeusi', 'en' => 'Black'], 'hex' => '#111111']],
            'storages' => ['128GB'],
            'rams' => [],
            'specs' => [],
            'rating' => 4.5,
            'review_count' => 10,
            'sold' => 0,
            'warranty_months' => 12,
            'tags' => [],
            'images' => [],
            'art' => ['kind' => 'phone', 'camera' => 'duo-diagonal'],
            'compatible_with' => [],
            'status' => 'published',
            'low_stock_threshold' => 2,
            'seo' => ['title' => '', 'description' => ''],
        ];
    }

    public function configure(): static
    {
        return $this->afterCreating(function (Product $product): void {
            if (! $product->variants()->exists()) {
                ProductVariant::create([
                    'id' => "{$product->id}-v0",
                    'product_id' => $product->id,
                    'sku' => Str::upper(Str::random(10)),
                    'color' => '#111111',
                    'storage' => '128GB',
                    'price' => $product->price,
                    'stock' => 10,
                ]);
            }
        });
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function withVariant(array $attributes): static
    {
        return $this->afterCreating(function (Product $product) use ($attributes): void {
            ProductVariant::create([
                'id' => "{$product->id}-v".$product->variants()->count(),
                'product_id' => $product->id,
                'sku' => Str::upper(Str::random(10)),
                'color' => '#111111',
                'storage' => '128GB',
                'price' => $product->price,
                'stock' => 10,
                ...$attributes,
            ]);
        });
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes) => ['status' => 'draft']);
    }
}
