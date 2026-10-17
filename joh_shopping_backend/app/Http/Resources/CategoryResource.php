<?php

namespace App\Http\Resources;

use App\Models\Category;
use Illuminate\Http\Request;

/**
 * @mixin Category
 */
class CategoryResource extends ApiResource
{
    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'description' => $this->description ?? ['sw' => '', 'en' => ''],
            'parentId' => $this->parent_id,
            'icon' => $this->icon,
            'art' => $this->art,
            'productCount' => (int) ($this->products_count ?? 0),
            'active' => $this->active,
            'sortOrder' => $this->sort_order,
        ];
    }
}
