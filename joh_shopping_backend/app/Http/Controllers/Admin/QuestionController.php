<?php

namespace App\Http\Controllers\Admin;

use App\Http\Resources\QuestionResource;
use App\Models\ProductQuestion;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Product Q&A: staff answer and publish customer questions.
 *
 * @extends ResourceController<ProductQuestion>
 */
class QuestionController extends ResourceController
{
    protected string $noun = 'question';

    protected bool $affectsStorefront = true;

    protected function model(): string
    {
        return ProductQuestion::class;
    }

    protected function resource(): string
    {
        return QuestionResource::class;
    }

    protected function label(Model $model): string
    {
        return mb_substr($model->question, 0, 80);
    }

    protected function searchable(): array
    {
        return ['question', 'answer', 'asked_by'];
    }

    protected function filterable(): array
    {
        return [
            'productId' => 'product_id',
            'published' => 'published',
            'answered' => fn ($query, string $value) => $value === 'true' ? $query->whereNotNull('answer') : $query->whereNull('answer'),
        ];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [
            'answer' => ['nullable', 'string', 'max:2000'],
            'published' => ['required', 'boolean'],
        ];
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Customers ask questions from product pages.'], 405);
    }
}
