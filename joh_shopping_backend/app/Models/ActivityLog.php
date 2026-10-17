<?php

namespace App\Models;

use App\Models\Concerns\HasPrefixedId;
use Illuminate\Database\Eloquent\Attributes\Unguarded;
use Illuminate\Database\Eloquent\Model;

/**
 * An audit-trail entry for a back-office action.
 */
#[Unguarded]
class ActivityLog extends Model
{
    use HasPrefixedId;

    public static function idPrefix(): string
    {
        return 'act';
    }
}
