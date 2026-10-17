<?php

namespace App\Models;

use App\Models\Concerns\HasPrefixedId;
use Illuminate\Database\Eloquent\Attributes\Unguarded;
use Illuminate\Database\Eloquent\Model;

#[Unguarded]
class Banner extends Model
{
    use HasPrefixedId;

    public static function idPrefix(): string
    {
        return 'bn';
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'title' => 'array',
            'subtitle' => 'array',
            'cta' => 'array',
            'active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
