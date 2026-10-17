<?php

namespace App\Http\Controllers\Concerns;

/**
 * Validation rules for bilingual `{ sw, en }` fields.
 */
trait LocalizedRules
{
    /**
     * @return array<string, list<string>>
     */
    protected static function localized(string $field, bool $required = true, int $max = 255): array
    {
        $presence = $required ? 'required' : 'nullable';
        $text = $required ? ['required', 'string', "max:{$max}"] : ['nullable', 'string', "max:{$max}"];

        return [
            $field => [$presence, 'array'],
            "{$field}.sw" => $text,
            "{$field}.en" => $text,
        ];
    }

    /**
     * Rules for a list of bilingual strings, e.g. highlights.
     *
     * @return array<string, list<string>>
     */
    protected static function localizedList(string $field, int $max = 500): array
    {
        return [
            $field => ['present', 'array', 'max:50'],
            "{$field}.*.sw" => ['required', 'string', "max:{$max}"],
            "{$field}.*.en" => ['required', 'string', "max:{$max}"],
        ];
    }
}
