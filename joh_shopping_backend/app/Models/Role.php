<?php

namespace App\Models;

use App\Models\Concerns\HasPrefixedId;
use Spatie\Permission\Models\Role as SpatieRole;

/**
 * Spatie role with string ids ("role-super") and bilingual description.
 * System roles cannot be deleted.
 */
class Role extends SpatieRole
{
    use HasPrefixedId;

    public static function idPrefix(): string
    {
        return 'role';
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'description' => 'array',
            'system' => 'boolean',
        ];
    }
}
