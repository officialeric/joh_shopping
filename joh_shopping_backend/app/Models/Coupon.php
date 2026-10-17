<?php

namespace App\Models;

use App\Models\Concerns\HasPrefixedId;
use Illuminate\Database\Eloquent\Attributes\Unguarded;
use Illuminate\Database\Eloquent\Model;

#[Unguarded]
class Coupon extends Model
{
    use HasPrefixedId;

    public static function idPrefix(): string
    {
        return 'cpn';
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'value' => 'integer',
            'min_spend' => 'integer',
            'max_discount' => 'integer',
            'usage_limit' => 'integer',
            'used' => 'integer',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
            'active' => 'boolean',
            'description' => 'array',
        ];
    }
}
