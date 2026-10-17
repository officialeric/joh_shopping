<?php

namespace App\Models;

use App\Models\Concerns\HasPrefixedId;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Attributes\Unguarded;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A sellable product. Price is the lowest variant price; stock lives on variants.
 */
#[Unguarded]
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory, HasPrefixedId;

    public static function idPrefix(): string
    {
        return 'p';
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'short_description' => 'array',
            'description' => 'array',
            'highlights' => 'array',
            'in_box' => 'array',
            'price' => 'integer',
            'compare_at_price' => 'integer',
            'colors' => 'array',
            'storages' => 'array',
            'rams' => 'array',
            'specs' => 'array',
            'rating' => 'float',
            'review_count' => 'integer',
            'sold' => 'integer',
            'warranty_months' => 'integer',
            'tags' => 'array',
            'images' => 'array',
            'art' => 'array',
            'compatible_with' => 'array',
            'low_stock_threshold' => 'integer',
            'battery_health' => 'integer',
            'seo' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Product $product): void {
            $names = collect($product->colors ?? [])->map(fn (array $color): string => mb_strtolower($color['name']['en'] ?? ''));
            $product->search_colors = '|'.$names->filter()->implode('|').'|';
        });
    }

    /**
     * @param  Builder<Product>  $query
     */
    #[Scope]
    protected function published(Builder $query): void
    {
        $query->where('status', 'published');
    }

    /**
     * @return BelongsTo<Brand, $this>
     */
    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    /**
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * @return HasMany<ProductVariant, $this>
     */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->orderBy('sort_order');
    }

    /**
     * @return HasMany<Review, $this>
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /**
     * @return HasMany<ProductQuestion, $this>
     */
    public function questions(): HasMany
    {
        return $this->hasMany(ProductQuestion::class);
    }

    public function isPhone(): bool
    {
        return $this->category_id === 'c-phones';
    }

    /**
     * Human label for a variant, e.g. "Black · 256GB · 8GB RAM".
     */
    public function variantLabel(ProductVariant $variant, string $locale = 'en'): string
    {
        $color = collect($this->colors)->firstWhere('hex', $variant->color)['name'][$locale] ?? null;
        $ram = $variant->ram && count($this->rams ?? []) ? "{$variant->ram} RAM" : null;

        return collect([$color, $variant->storage, $ram])->filter()->implode(' · ');
    }
}
