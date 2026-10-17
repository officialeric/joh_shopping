<?php

namespace App\Http\Resources;

use App\Models\Brand;
use Illuminate\Http\Request;

/**
 * @mixin Brand
 */
class BrandResource extends ApiResource
{
    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'country' => (string) $this->country,
            'active' => $this->active,
            'productCount' => (int) ($this->products_count ?? 0),
        ];
    }
}
