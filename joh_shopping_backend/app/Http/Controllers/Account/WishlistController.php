<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Server-side wishlist, so it follows the customer across devices.
 * POST /api/wishlist/sync merges the browser's list after sign-in.
 */
class WishlistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->ids($this->user($request))]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['productId' => ['required', 'string', 'exists:products,id']]);
        $this->user($request)->wishlist()->syncWithoutDetaching([$data['productId']]);

        return response()->json(['data' => $this->ids($this->user($request))], 201);
    }

    public function destroy(Request $request, string $product): JsonResponse
    {
        $this->user($request)->wishlist()->detach($product);

        return response()->json(['data' => $this->ids($this->user($request))]);
    }

    public function sync(Request $request): JsonResponse
    {
        $data = $request->validate(['ids' => ['present', 'array', 'max:200'], 'ids.*' => ['string']]);
        $existing = Product::query()->whereKey($data['ids'])->pluck('id')->all();
        $this->user($request)->wishlist()->syncWithoutDetaching($existing);

        return response()->json(['data' => $this->ids($this->user($request))]);
    }

    /**
     * @return list<string>
     */
    private function ids(User $user): array
    {
        return $user->wishlist()->orderByPivot('created_at', 'desc')->pluck('products.id')->all();
    }

    private function user(Request $request): User
    {
        return $request->user();
    }
}
