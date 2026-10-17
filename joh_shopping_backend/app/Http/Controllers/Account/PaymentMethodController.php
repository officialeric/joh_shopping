<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Http\Resources\SavedPaymentMethodResource;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Saved payment preferences (labels only, e.g. "M-Pesa +255 712…" or "Visa •••• 4242").
 * Card numbers never reach this server; the gateway tokenises them.
 */
class PaymentMethodController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return SavedPaymentMethodResource::collection($this->user($request)->savedPaymentMethods()->oldest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'method' => ['required', Rule::in(array_diff(Order::PAYMENT_METHODS, ['cod']))],
            'label' => ['required', 'string', 'max:80', 'not_regex:/\d{12,}/'],
        ]);

        $user = $this->user($request);
        $method = $user->savedPaymentMethods()->create([
            ...$data,
            'is_default' => ! $user->savedPaymentMethods()->exists(),
        ]);

        return (new SavedPaymentMethodResource($method))->response()->setStatusCode(201);
    }

    public function makeDefault(Request $request, string $method): JsonResponse
    {
        $user = $this->user($request);
        $user->savedPaymentMethods()->findOrFail($method);

        DB::transaction(function () use ($user, $method): void {
            $user->savedPaymentMethods()->update(['is_default' => false]);
            $user->savedPaymentMethods()->whereKey($method)->update(['is_default' => true]);
        });

        return response()->json(['ok' => true]);
    }

    public function destroy(Request $request, string $method): JsonResponse
    {
        $user = $this->user($request);
        $model = $user->savedPaymentMethods()->findOrFail($method);
        $model->delete();

        if ($model->is_default) {
            $user->savedPaymentMethods()->oldest()->first()?->update(['is_default' => true]);
        }

        return response()->json(null, 204);
    }

    private function user(Request $request): User
    {
        return $request->user();
    }
}
