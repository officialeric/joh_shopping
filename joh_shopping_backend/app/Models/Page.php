<?php

namespace App\Models;

use App\Models\Concerns\HasPrefixedId;
use Illuminate\Database\Eloquent\Attributes\Unguarded;
use Illuminate\Database\Eloquent\Model;

/**
 * A CMS page (policies). Body uses the frontend's lightweight markup.
 */
#[Unguarded]
class Page extends Model
{
    use HasPrefixedId;

    public static function idPrefix(): string
    {
        return 'pg';
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'title' => 'array',
            'body' => 'array',
            'published' => 'boolean',
        ];
    }
}
