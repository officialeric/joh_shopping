<?php

namespace App\Http\Resources;

use App\Models\Coupon;
use Illuminate\Http\Request;

/**
 * @mixin Coupon
 */
class CouponResource extends ApiResource
{
    protected array $optional = ['maxDiscount'];

    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'type' => $this->type,
            'value' => $this->value,
            'minSpend' => $this->min_spend,
            'maxDiscount' => $this->max_discount,
            'usageLimit' => $this->usage_limit,
            'used' => $this->used,
            'startsAt' => self::iso($this->starts_at),
            'expiresAt' => self::iso($this->expires_at),
            'active' => $this->active,
            'description' => $this->description,
        ];
    }
}
