<?php

namespace App\Http\Resources;

use App\Models\ProductQuestion;
use Illuminate\Http\Request;

/**
 * @mixin ProductQuestion
 */
class QuestionResource extends ApiResource
{
    protected array $optional = ['answer'];

    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'productId' => $this->product_id,
            'question' => $this->question,
            'answer' => $this->answer,
            'askedBy' => $this->asked_by,
            'published' => $this->published,
            'createdAt' => self::iso($this->created_at),
        ];
    }
}
