<?php

namespace App\Models;

use App\Models\Concerns\HasPrefixedId;
use Illuminate\Database\Eloquent\Attributes\Unguarded;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Unguarded]
class FlashSale extends Model
{
    use HasPrefixedId;

    public static function idPrefix(): string
    {
        return 'fs';
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'name' => 'array',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<FlashSaleItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(FlashSaleItem::class);
    }
}
