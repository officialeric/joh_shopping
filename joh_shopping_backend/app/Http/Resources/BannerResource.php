<?php

namespace App\Http\Resources;

use App\Models\Banner;
use Illuminate\Http\Request;

/**
 * @mixin Banner
 */
class BannerResource extends ApiResource
{
    protected array $optional = ['productId', 'image'];

    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'cta' => $this->cta,
            'href' => $this->href,
            'productId' => $this->product_id,
            'image' => $this->image,
            'placement' => $this->placement,
            'theme' => $this->theme,
            'active' => $this->active,
            'sortOrder' => $this->sort_order,
        ];
    }
}
