<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\CartPricer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CartController extends Controller
{
    public function __construct(private CartPricer $pricer) {}

    /**
     * Price a cart: live prices, flash sales, coupon and shipping for a region.
     */
    public function quote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lines' => ['present', 'array', 'max:50'],
            'lines.*.productId' => ['required', 'string'],
            'lines.*.variantId' => ['required', 'string'],
            'lines.*.qty' => ['required', 'integer', 'between:1,99'],
            'couponCode' => ['nullable', 'string', 'max:40'],
            'region' => ['nullable', 'string', 'max:80'],
            'delivery' => ['nullable', Rule::in(Order::DELIVERY_METHODS)],
        ]);

        $quote = $this->pricer->quote($data['lines'], $data['couponCode'] ?? null, $data['region'] ?? null, $data['delivery'] ?? 'standard');

        return response()->json(['data' => CartPricer::present($quote)]);
    }
}
