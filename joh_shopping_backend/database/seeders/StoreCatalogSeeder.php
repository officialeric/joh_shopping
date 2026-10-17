<?php

namespace Database\Seeders;

use App\Support\StorefrontCache;
use Carbon\CarbonImmutable;
use Database\Seeders\Concerns\SeedsCatalog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * The starter catalog of a clean store: 4–5 products per category plus the
 * storefront banners (hero, promo and category), from seed.json.
 *
 * Safe on a live database: rows that already exist (same id or slug) are
 * left alone, so it never overwrites products you edited.
 *
 *   php artisan db:seed --class=StoreCatalogSeeder
 */
class StoreCatalogSeeder extends Seeder
{
    use SeedsCatalog;

    /**
     * @var list<string>
     */
    public const PRODUCTS = [
        // Smartphones
        'p-ip16pm', 'p-s25u', 'p-ip15-used', 'p-rn14p', 'p-spark30',
        // Audio
        'a-airpodspro2', 'a-buds3pro', 'a-freepods', 'a-jblflip',
        // Chargers & cables
        'a-apple20w', 'a-sam45w', 'a-baseus100w', 'a-lightning',
        // Power banks
        'a-anker20k', 'a-oraimo27k', 'a-baseus10k', 'a-oraimo10k',
        // Cases
        'a-case16pm', 'a-cases25u', 'a-case16', 'a-caseshockproof',
        // Screen protectors
        'a-glass', 'a-privacy16pm', 'a-lensglass', 'a-glassrn14',
        // Smartwatches
        'a-watch10', 'a-gwatch7', 'a-redmiwatch5', 'a-oraimowatch',
    ];

    public function run(): void
    {
        $seed = json_decode((string) file_get_contents(database_path('seeders/data/seed.json')), true, flags: JSON_THROW_ON_ERROR);
        $rows = collect($seed['products'])->keyBy('id');
        // Keep the seed's relative dates (for "New arrivals"), moved so the newest lands at now.
        $shift = CarbonImmutable::now()->getTimestamp() - CarbonImmutable::parse($seed['seedNow'])->getTimestamp();

        DB::transaction(function () use ($seed, $rows, $shift): void {
            $existingIds = DB::table('products')->pluck('id')->flip();
            $existingSlugs = DB::table('products')->pluck('slug')->flip();

            foreach (self::PRODUCTS as $id) {
                $p = $rows[$id] ?? null;
                if (! $p || isset($existingIds[$id]) || isset($existingSlugs[$p['slug']])) {
                    continue;
                }

                // A clean store starts with no sales or reviews; links only to products in the store.
                $this->seedProduct([
                    ...$p,
                    'sold' => 0,
                    'rating' => 0,
                    'reviewCount' => 0,
                    'compatibleWith' => array_values(array_intersect($p['compatibleWith'], self::PRODUCTS)),
                ], CarbonImmutable::parse($p['createdAt'])->utc()->addSeconds($shift)->toDateTimeString());
            }

            $products = DB::table('products')->pluck('id')->flip();
            $banners = DB::table('banners')->pluck('id')->flip();
            foreach ($seed['banners'] as $b) {
                $productMissing = isset($b['productId']) && ! isset($products[$b['productId']]);
                if (! isset($banners[$b['id']]) && ! $productMissing) {
                    $this->seedBanner($b);
                }
            }
        });

        StorefrontCache::flush();
    }
}
