<?php

namespace Database\Seeders\Concerns;

use App\Models\Product;
use Illuminate\Support\Facades\DB;

/**
 * Inserts products (with variants) and banners from seed.json rows.
 */
trait SeedsCatalog
{
    /**
     * @param  array<string, mixed>  $p
     */
    protected function seedProduct(array $p, ?string $createdAt): void
    {
        Product::create([
            'id' => $p['id'],
            'slug' => $p['slug'],
            'name' => $p['name'],
            'brand_id' => $p['brandId'],
            'category_id' => $p['categoryId'],
            'condition' => $p['condition'],
            'grade' => $p['grade'] ?? null,
            'battery_health' => $p['batteryHealth'] ?? null,
            'short_description' => $p['shortDescription'],
            'description' => $p['description'],
            'highlights' => $p['highlights'],
            'in_box' => $p['inBox'],
            'price' => $p['price'],
            'compare_at_price' => $p['compareAtPrice'] ?? null,
            'colors' => $p['colors'],
            'storages' => $p['storages'],
            'rams' => $p['rams'],
            'specs' => $p['specs'],
            'rating' => $p['rating'],
            'review_count' => $p['reviewCount'],
            'sold' => $p['sold'],
            'warranty_months' => $p['warrantyMonths'],
            'tags' => $p['tags'],
            'images' => $p['images'],
            'art' => $p['art'],
            'compatible_with' => $p['compatibleWith'],
            'status' => $p['status'],
            'low_stock_threshold' => $p['lowStockThreshold'],
            'seo' => $p['seo'],
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);

        $now = now()->toDateTimeString();
        DB::table('product_variants')->insert(array_map(fn (array $v, int $i): array => [
            'id' => $v['id'],
            'product_id' => $p['id'],
            'sku' => $v['sku'],
            'color' => strtolower($v['color']),
            'storage' => $v['storage'] ?? null,
            'ram' => $v['ram'] ?? null,
            'price' => $v['price'],
            'compare_at_price' => $v['compareAtPrice'] ?? null,
            'stock' => $v['stock'],
            'sort_order' => $i,
            'created_at' => $now,
            'updated_at' => $now,
        ], $p['variants'], array_keys($p['variants'])));
    }

    /**
     * @param  array<string, mixed>  $b
     */
    protected function seedBanner(array $b): void
    {
        $now = now()->toDateTimeString();
        DB::table('banners')->insert([
            'id' => $b['id'],
            'title' => json_encode($b['title'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            'subtitle' => json_encode($b['subtitle'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            'cta' => json_encode($b['cta'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            'href' => $b['href'],
            'product_id' => $b['productId'] ?? null,
            'image' => null,
            'placement' => $b['placement'],
            'theme' => $b['theme'],
            'active' => $b['active'],
            'sort_order' => $b['sortOrder'],
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
}
