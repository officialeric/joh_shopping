<?php

namespace App\Http\Controllers\Admin;

use App\Http\Resources\ReviewResource;
use App\Models\Review;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Review moderation. Approving or un-approving a review updates the product's
 * rating and review count.
 *
 * @extends ResourceController<Review>
 */
class ReviewController extends ResourceController
{
    protected string $noun = 'review';

    protected bool $affectsStorefront = true;

    protected function model(): string
    {
        return Review::class;
    }

    protected function resource(): string
    {
        return ReviewResource::class;
    }

    protected function label(Model $model): string
    {
        return $model->title;
    }

    protected function searchable(): array
    {
        return ['customer_name', 'title', 'body'];
    }

    protected function sortable(): array
    {
        return ['createdAt' => 'created_at', 'rating' => 'rating', 'helpful' => 'helpful', 'status' => 'status'];
    }

    protected function filterable(): array
    {
        return ['status' => 'status', 'productId' => 'product_id', 'rating' => 'rating', 'verified' => 'verified'];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [
            'status' => ['required', Rule::in(['approved', 'pending', 'hidden'])],
            'reply' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Customers write reviews from product pages.'], 405);
    }

    /**
     * @param  Review  $model
     */
    protected function afterSave(Model $model, array $data, bool $created): void
    {
        if ($model->wasChanged('status')) {
            $wasApproved = ($model->getPrevious()['status'] ?? null) === 'approved';
            $isApproved = $model->status === 'approved';
            if ($wasApproved !== $isApproved) {
                self::adjustProductRating($model, $isApproved ? 1 : -1);
            }
        }
    }

    protected function ensureDeletable(Model $model): void
    {
        if ($model->status === 'approved') {
            self::adjustProductRating($model, -1);
        }
    }

    /**
     * Fold one review in or out of the product's running average.
     */
    public static function adjustProductRating(Review $review, int $direction): void
    {
        $product = $review->product()->first();
        if (! $product) {
            return;
        }

        $count = $product->review_count;
        $total = $product->rating * $count + $direction * $review->rating;
        $newCount = max(0, $count + $direction);

        $product->forceFill([
            'review_count' => $newCount,
            'rating' => $newCount > 0 ? round(max(0, min(5, $total / $newCount)), 1) : 0,
        ])->save();
    }
}
