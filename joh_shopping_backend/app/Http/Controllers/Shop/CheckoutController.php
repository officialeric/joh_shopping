<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use App\Rules\TanzanianPhone;
use App\Services\CheckoutService;
use App\Services\Payments\PaymentService;
use App\Support\Phone;
use App\Support\StoreSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Checkout for guests and customers, order look-up and payment status.
 */
class CheckoutController extends Controller
{
    private const SESSION_ORDERS = 'checkout.orders';

    public function __construct(
        private CheckoutService $checkout,
        private PaymentService $payments,
    ) {}

    /**
     * POST /api/orders. For mobile money the gateway then sends a PIN prompt to
     * the payer's phone; for cards the response may carry a redirect URL.
     */
    public function store(Request $request): JsonResponse
    {
        if (StoreSettings::get('maintenanceMode')) {
            return response()->json(['message' => 'maintenance'], 503);
        }

        $data = $request->validate([
            'contact.name' => ['required', 'string', 'max:120'],
            'contact.email' => ['required', 'email', 'max:255'],
            'contact.phone' => ['required', new TanzanianPhone],
            'delivery' => ['required', Rule::in(Order::DELIVERY_METHODS)],
            'address' => ['nullable', 'required_unless:delivery,pickup', 'array'],
            'address.fullName' => ['required_unless:delivery,pickup', 'nullable', 'string', 'max:120'],
            'address.phone' => ['required_unless:delivery,pickup', 'nullable', new TanzanianPhone],
            'address.region' => ['required_unless:delivery,pickup', 'nullable', 'string', 'max:80'],
            'address.district' => ['required_unless:delivery,pickup', 'nullable', 'string', 'max:80'],
            'address.street' => ['required_unless:delivery,pickup', 'nullable', 'string', 'max:255'],
            'address.landmark' => ['nullable', 'string', 'max:255'],
            'pickupStoreId' => ['nullable', 'required_if:delivery,pickup', 'string'],
            'paymentMethod' => ['required', Rule::in(Order::PAYMENT_METHODS)],
            'payerPhone' => ['nullable', Rule::requiredIf(in_array($request->input('paymentMethod'), Order::MOBILE_MONEY, true)), new TanzanianPhone],
            'cardLast4' => ['nullable', 'digits:4'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'lines' => ['required', 'array', 'min:1', 'max:50'],
            'lines.*.productId' => ['required', 'string'],
            'lines.*.variantId' => ['required', 'string'],
            'lines.*.qty' => ['required', 'integer', 'between:1,99'],
            'couponCode' => ['nullable', 'string', 'max:40'],
            'subscribe' => ['sometimes', 'boolean'],
            'locale' => ['sometimes', Rule::in(['sw', 'en'])],
        ]);

        $data['contact']['phone'] = Phone::normalize($data['contact']['phone']);
        if (! empty($data['address']['phone'])) {
            $data['address']['phone'] = Phone::normalize($data['address']['phone']);
        }
        if (! empty($data['payerPhone'])) {
            $data['payerPhone'] = Phone::normalize($data['payerPhone']);
        }

        $user = $this->customer();
        ['order' => $order, 'payment' => $payment] = $this->checkout->place($data, $user, $data['locale'] ?? 'sw');

        if ($request->hasSession()) {
            $request->session()->push(self::SESSION_ORDERS, $order->id);
        }

        return (new OrderResource($order))
            ->additional(['payment' => [...$payment->toArray(), 'reference' => $order->payment()->value('reference')]])
            ->response()
            ->setStatusCode(201);
    }

    /**
     * The confirmation page: allowed for the order's owner or the browser session that placed it.
     */
    public function lookup(Request $request, string $number): OrderResource
    {
        $order = Order::query()->with(['items', 'events'])->where('number', mb_strtoupper($number))->firstOrFail();
        $this->authorizeView($request, $order);

        return new OrderResource($order);
    }

    /**
     * Guest tracking: order number + the email or phone used at checkout.
     */
    public function track(Request $request): OrderResource
    {
        $data = $request->validate([
            'number' => ['required', 'string', 'max:30'],
            'contact' => ['required', 'string', 'max:255'],
        ]);

        $order = Order::query()->with(['items', 'events'])->where('number', mb_strtoupper(trim($data['number'])))->first();

        if (! $order || ! $order->matchesContact($data['contact'])) {
            abort(response()->json(['message' => 'not_found'], 404));
        }

        return new OrderResource($order);
    }

    /**
     * Poll after a PIN prompt / 3-D Secure redirect.
     */
    public function paymentStatus(string $reference): JsonResponse
    {
        $payment = Payment::query()->with('order')->where('reference', $reference)->firstOrFail();

        return response()->json(['data' => [
            'reference' => $payment->reference,
            'status' => $payment->status,
            'orderNumber' => $payment->order->number,
            'orderStatus' => $payment->order->status,
        ]]);
    }

    /**
     * Try again after a failed or abandoned payment (e.g. PIN prompt timed out).
     */
    public function retryPayment(Request $request, string $number): JsonResponse
    {
        $order = Order::query()->with(['items', 'events'])->where('number', mb_strtoupper($number))->firstOrFail();
        $this->authorizeView($request, $order);

        $data = $request->validate([
            'paymentMethod' => ['sometimes', Rule::in(array_diff(Order::PAYMENT_METHODS, ['cod']))],
            'payerPhone' => ['nullable', new TanzanianPhone],
            'cardLast4' => ['nullable', 'digits:4'],
        ]);

        if ($order->status === 'cancelled' || in_array($order->payment_status, ['paid', 'refunded', 'partially_refunded'], true)) {
            throw ValidationException::withMessages(['order' => 'payment_not_needed']);
        }

        $method = $data['paymentMethod'] ?? $order->payment_method;
        if (! StoreSettings::paymentMethodEnabled($method)) {
            throw ValidationException::withMessages(['paymentMethod' => 'payment_method_unavailable']);
        }
        if (in_array($method, Order::MOBILE_MONEY, true) && empty($data['payerPhone'])) {
            throw ValidationException::withMessages(['payerPhone' => 'required']);
        }

        $order->payments()->where('status', 'pending')->update(['status' => 'failed']);
        $order->update(['payment_method' => $method, 'payment_status' => 'pending']);
        $payment = $this->payments->createFor($order, isset($data['payerPhone']) ? Phone::normalize($data['payerPhone']) : null, $data['cardLast4'] ?? null);
        $initiation = $this->payments->initiate($payment, $data);

        return (new OrderResource($order->refresh()->load(['items', 'events'])))
            ->additional(['payment' => [...$initiation->toArray(), 'reference' => $payment->reference]])
            ->response();
    }

    private function customer(): ?User
    {
        $user = Auth::guard('sanctum')->user();

        return $user instanceof User && ! $user->isBlocked() ? $user : null;
    }

    private function authorizeView(Request $request, Order $order): void
    {
        $user = $this->customer();
        $ownsIt = $user && $order->user_id === $user->id;
        $placedHere = $request->hasSession() && in_array($order->id, $request->session()->get(self::SESSION_ORDERS, []), true);

        if (! $ownsIt && ! $placedHere) {
            abort(response()->json(['message' => 'not_found'], 404));
        }
    }
}
