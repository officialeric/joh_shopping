<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;

/**
 * @mixin Product
 */
class ProductResource extends ApiResource
{
    protected array $optional = ['grade', 'batteryHealth', 'compareAtPrice'];

    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'brandId' => $this->brand_id,
            'categoryId' => $this->category_id,
            'condition' => $this->condition,
            'grade' => $this->grade,
            'batteryHealth' => $this->battery_health,
            'shortDescription' => $this->short_description,
            'description' => $this->description,
            'highlights' => $this->highlights,
            'inBox' => $this->in_box,
            'price' => $this->price,
            'compareAtPrice' => $this->compare_at_price,
            'colors' => $this->colors,
            'storages' => $this->storages,
            'rams' => $this->rams,
            'variants' => VariantResource::collection($this->whenLoaded('variants')),
            'specs' => $this->specs,
            'rating' => $this->rating,
            'reviewCount' => $this->review_count,
            'sold' => $this->sold,
            'warrantyMonths' => $this->warranty_months,
            'tags' => $this->tags,
            'images' => $this->images,
            'art' => $this->art,
            'compatibleWith' => $this->compatible_with,
            'status' => $this->status,
            'lowStockThreshold' => $this->low_stock_threshold,
            'seo' => $this->seo,
            'createdAt' => self::iso($this->created_at),
        ];
    }
}
