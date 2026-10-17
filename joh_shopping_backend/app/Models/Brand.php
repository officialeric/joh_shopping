<?php

namespace App\Models;

use App\Models\Concerns\HasPrefixedId;
use Database\Factories\BrandFactory;
use Illuminate\Database\Eloquent\Attributes\Unguarded;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Unguarded]
class Brand extends Model
{
    /** @use HasFactory<BrandFactory> */
    use HasFactory, HasPrefixedId;

    public static function idPrefix(): string
    {
        return 'b';
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<Product, $this>
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
