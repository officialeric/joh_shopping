<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\LocalizedRules;
use App\Http\Resources\CouponResource;
use App\Models\Coupon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @extends ResourceController<Coupon>
 */
class CouponController extends ResourceController
{
    use LocalizedRules;

    protected string $noun = 'coupon';

    protected bool $affectsStorefront = true;

    protected function model(): string
    {
        return Coupon::class;
    }

    protected function resource(): string
    {
        return CouponResource::class;
    }

    protected function label(Model $model): string
    {
        return $model->code;
    }

    protected function searchable(): array
    {
        return ['code'];
    }

    protected function sortable(): array
    {
        return ['createdAt' => 'created_at', 'code' => 'code', 'used' => 'used', 'expiresAt' => 'expires_at', 'startsAt' => 'starts_at'];
    }

    protected function filterable(): array
    {
        return ['active' => 'active', 'type' => 'type'];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [
            'code' => ['required', 'string', 'max:40', 'regex:/^[A-Za-z0-9_-]+$/', Rule::unique('coupons', 'code')->ignore($model?->getKey())],
            'type' => ['required', Rule::in(['percent', 'fixed', 'free_shipping'])],
            'value' => ['required', 'integer', 'min:0', Rule::when($request->input('type') === 'percent', ['max:100'])],
            'minSpend' => ['required', 'integer', 'min:0'],
            'maxDiscount' => ['nullable', 'integer', 'min:0'],
            'usageLimit' => ['required', 'integer', 'min:0'],
            'used' => ['sometimes', 'integer', 'min:0'],
            'startsAt' => ['required', 'date'],
            'expiresAt' => ['required', 'date', 'after:startsAt'],
            'active' => ['required', 'boolean'],
            ...self::localized('description', true, 255),
        ];
    }

    protected function fill(Model $model, array $data): void
    {
        if (isset($data['code'])) {
            $data['code'] = mb_strtoupper($data['code']);
        }
        parent::fill($model, $data);
    }
}
