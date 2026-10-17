<?php

namespace App\Http\Resources;

use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Base resource: camelCase keys matching the frontend types, ISO-8601 dates,
 * and optional keys dropped when null (TypeScript `field?: T`).
 */
abstract class ApiResource extends JsonResource
{
    /**
     * Keys omitted from the output when their value is null.
     *
     * @var list<string>
     */
    protected array $optional = [];

    /**
     * @return array<string, mixed>
     */
    abstract protected function fields(Request $request): array;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $fields = $this->fields($request);

        foreach ($this->optional as $key) {
            if (array_key_exists($key, $fields) && $fields[$key] === null) {
                unset($fields[$key]);
            }
        }

        return $fields;
    }

    protected static function iso(?CarbonInterface $date): ?string
    {
        return $date?->toIso8601ZuluString('millisecond');
    }
}
