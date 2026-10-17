<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\LocalizedRules;
use App\Http\Resources\AttributeValueResource;
use App\Models\AttributeValue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @extends ResourceController<AttributeValue>
 */
class AttributeController extends ResourceController
{
    use LocalizedRules;

    protected string $noun = 'attribute';

    protected string $defaultSort = 'type';

    protected function model(): string
    {
        return AttributeValue::class;
    }

    protected function resource(): string
    {
        return AttributeValueResource::class;
    }

    protected function label(Model $model): string
    {
        return "{$model->type}: {$model->value}";
    }

    protected function searchable(): array
    {
        return ['value'];
    }

    protected function sortable(): array
    {
        return ['type' => 'type', 'value' => 'value', 'createdAt' => 'created_at'];
    }

    protected function filterable(): array
    {
        return ['type' => 'type'];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [
            'type' => ['required', Rule::in(['color', 'storage', 'ram', 'grade'])],
            'value' => ['required', 'string', 'max:60'],
            ...self::localized('label', false, 60),
            'hex' => ['nullable', 'required_if:type,color', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ];
    }
}
