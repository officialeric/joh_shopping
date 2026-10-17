<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Gap-tolerant, race-safe counters for human-facing numbers (orders, RMAs).
 * Call inside a transaction.
 */
class Sequence
{
    public static function next(string $name, int $start): int
    {
        $row = DB::table('counters')->where('name', $name)->lockForUpdate()->first();

        if (! $row) {
            DB::table('counters')->insert(['name' => $name, 'value' => $start]);

            return $start;
        }

        $value = (int) $row->value + 1;
        DB::table('counters')->where('name', $name)->update(['value' => $value]);

        return $value;
    }

    public static function set(string $name, int $value): void
    {
        DB::table('counters')->updateOrInsert(['name' => $name], ['value' => $value]);
    }
}
