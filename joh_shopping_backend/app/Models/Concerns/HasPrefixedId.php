<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * String primary keys shaped like the frontend ids, e.g. "ord-01k7…" or "cus-demo".
 * Seeded rows keep their original ids; new rows get "{prefix}-{lowercase ulid}".
 */
trait HasPrefixedId
{
    abstract public static function idPrefix(): string;

    public static function bootHasPrefixedId(): void
    {
        static::creating(function (Model $model): void {
            if (! $model->getKey()) {
                $model->setAttribute($model->getKeyName(), static::newPrefixedId());
            }
        });
    }

    public function initializeHasPrefixedId(): void
    {
        $this->incrementing = false;
        $this->keyType = 'string';
    }

    public static function newPrefixedId(): string
    {
        return static::idPrefix().'-'.Str::lower((string) Str::ulid());
    }
}
