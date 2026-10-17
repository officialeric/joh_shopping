<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReturnRequestResource;
use App\Models\Order;
use App\Models\ReturnRequest;
use App\Models\User;
use App\Support\Sequence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Returns and warranty claims opened by the customer.
 */
class ReturnController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return ReturnRequestResource::collection(
            ReturnRequest::query()->with('order')->where('user_id', $this->user($request)->id)->latest()->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $data = $request->validate([
            'orderId' => ['required', 'string'],
            'productName' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['return', 'warranty'])],
            'reason' => ['required', 'string', 'max:255'],
            'details' => ['required', 'string', 'max:5000'],
            'imei' => ['nullable', 'regex:/^\d{15}$/'],
            'resolution' => ['required', Rule::in(['refund', 'replacement', 'repair'])],
        ]);

        $order = Order::query()->where('user_id', $user->id)->findOrFail($data['orderId']);
        if (! in_array($order->status, ['delivered', 'returned'], true)) {
            throw ValidationException::withMessages(['orderId' => 'order_not_delivered']);
        }

        $return = DB::transaction(fn () => ReturnRequest::create([
            'number' => 'RMA-'.Sequence::next('returns', 5100),
            'type' => $data['type'],
            'order_id' => $order->id,
            'user_id' => $user->id,
            'customer_name' => $order->customer_name,
            'product_name' => $data['productName'],
            'imei' => $data['imei'] ?? null,
            'reason' => $data['reason'],
            'details' => $data['details'],
            'status' => 'requested',
            'resolution' => $data['resolution'],
        ]));

        return (new ReturnRequestResource($return->load('order')))->response()->setStatusCode(201);
    }

    private function user(Request $request): User
    {
        return $request->user();
    }
}
