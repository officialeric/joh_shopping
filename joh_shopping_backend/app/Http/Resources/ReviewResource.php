<?php

namespace App\Http\Resources;

use App\Models\Review;
use Illuminate\Http\Request;

/**
 * @mixin Review
 */
class ReviewResource extends ApiResource
{
    protected array $optional = ['reply'];

    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'productId' => $this->product_id,
            'customerName' => $this->customer_name,
            'rating' => $this->rating,
            'title' => $this->title,
            'body' => $this->body,
            'verified' => $this->verified,
            'helpful' => $this->helpful,
            'status' => $this->status,
            'reply' => $this->reply,
            'createdAt' => self::iso($this->created_at),
        ];
    }
}
