<?php

namespace App\Models;

use App\Models\Concerns\HasPrefixedId;
use Illuminate\Database\Eloquent\Attributes\Unguarded;
use Illuminate\Database\Eloquent\Model;

/**
 * A reusable option value (colour, storage, RAM, grade) for the product editor.
 */
#[Unguarded]
class AttributeValue extends Model
{
    use HasPrefixedId;

    public static function idPrefix(): string
    {
        return 'att';
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'label' => 'array',
        ];
    }
}
