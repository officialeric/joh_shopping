<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Resources\QuestionResource;
use App\Http\Resources\ReviewResource;
use App\Models\ContactMessage;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\StockAlert;
use App\Models\Subscriber;
use App\Models\User;
use App\Rules\TanzanianPhone;
use App\Support\Phone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Reviews, Q&A, back-in-stock alerts, contact form and newsletter.
 */
class EngagementController extends Controller
{
    public function reviews(Request $request, Product $product): AnonymousResourceCollection
    {
        $query = $product->reviews()->where('status', 'approved');

        match ($request->query('sort')) {
            'helpful' => $query->orderByDesc('helpful'),
            'highest' => $query->orderByDesc('rating'),
            'lowest' => $query->orderBy('rating'),
            default => $query->latest(),
        };

        return ReviewResource::collection($query->paginate(min(50, (int) $request->query('perPage', 10))));
    }

    /**
     * Customers review a product once; "verified" when they received it.
     */
    public function submitReview(Request $request, Product $product): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $data = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:3000'],
        ]);

        if ($product->reviews()->where('user_id', $user->id)->exists()) {
            throw ValidationException::withMessages(['product' => 'already_reviewed']);
        }

        $verified = Order::query()
            ->where('user_id', $user->id)
            ->whereIn('status', ['delivered', 'returned'])
            ->whereHas('items', fn ($items) => $items->where('product_id', $product->id))
            ->exists();

        $review = $product->reviews()->create([
            ...$data,
            'user_id' => $user->id,
            'customer_name' => $user->name,
            'verified' => $verified,
            'status' => 'pending',
        ]);

        return (new ReviewResource($review))->response()->setStatusCode(201);
    }

    public function markHelpful(Product $product, Review $review): JsonResponse
    {
        abort_unless($review->product_id === $product->id && $review->status === 'approved', 404);
        $review->increment('helpful');

        return response()->json(['data' => ['helpful' => $review->helpful]]);
    }

    public function questions(Product $product): AnonymousResourceCollection
    {
        return QuestionResource::collection($product->questions()->where('published', true)->latest()->limit(50)->get());
    }

    public function askQuestion(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate(['question' => ['required', 'string', 'min:5', 'max:1000']]);
        $user = Auth::guard('sanctum')->user();

        $question = $product->questions()->create([
            'question' => $data['question'],
            'user_id' => $user instanceof User ? $user->id : null,
            'asked_by' => $user instanceof User ? $user->name : 'Guest',
            'published' => false,
        ]);

        return (new QuestionResource($question))->response()->setStatusCode(201);
    }

    public function stockAlert(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email', 'max:255']]);

        StockAlert::query()->updateOrCreate(
            ['product_id' => $product->id, 'email' => mb_strtolower($data['email'])],
            ['notified_at' => null],
        );

        return response()->json(['ok' => true], 201);
    }

    public function contact(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', new TanzanianPhone],
            'subject' => ['required', 'string', 'max:160'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        ContactMessage::create([
            ...$data,
            'phone' => isset($data['phone']) ? Phone::normalize($data['phone']) : null,
            'status' => 'new',
        ]);

        return response()->json(['ok' => true], 201);
    }

    public function subscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'source' => ['sometimes', Rule::in(['footer', 'checkout', 'popup'])],
        ]);

        Subscriber::query()->updateOrCreate(
            ['email' => mb_strtolower($data['email'])],
            ['source' => $data['source'] ?? 'footer', 'active' => true],
        );

        return response()->json(['ok' => true], 201);
    }
}
