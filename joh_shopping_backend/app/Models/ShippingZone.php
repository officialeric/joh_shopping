<?php

namespace App\Models;

use App\Models\Concerns\HasPrefixedId;
use Illuminate\Database\Eloquent\Attributes\Unguarded;
use Illuminate\Database\Eloquent\Model;

#[Unguarded]
class ShippingZone extends Model
{
    use HasPrefixedId;

    public static function idPrefix(): string
    {
        return 'zn';
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'regions' => 'array',
            'standard_fee' => 'integer',
            'express_fee' => 'integer',
            'free_above' => 'integer',
            'active' => 'boolean',
        ];
    }
}
