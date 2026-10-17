<?php

namespace App\Support;

/**
 * Tanzanian phone numbers, normalised to +255XXXXXXXXX.
 */
class Phone
{
    /**
     * Accepts 0712…, 712…, 255712… or +255 712 … and returns +255712…, or null if invalid.
     */
    public static function normalize(?string $input): ?string
    {
        $digits = preg_replace('/\D/', '', (string) $input) ?? '';

        if (str_starts_with($digits, '255')) {
            $digits = substr($digits, 3);
        } elseif (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        return preg_match('/^[67]\d{8}$/', $digits) ? '+255'.$digits : null;
    }

    public static function isValid(?string $input): bool
    {
        return self::normalize($input) !== null;
    }

    /**
     * Last nine digits, used to match a number regardless of format.
     */
    public static function tail(?string $input): string
    {
        return substr(preg_replace('/\D/', '', (string) $input) ?? '', -9);
    }
}
