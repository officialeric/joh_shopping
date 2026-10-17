<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;

/**
 * Receives payment provider callbacks: POST /api/payments/webhooks/{driver}.
 * Each driver verifies its own signature in parseCallback().
 */
class PaymentWebhookController extends Controller
{
    public function __construct(private PaymentService $payments) {}

    public function __invoke(Request $request, string $driver): JsonResponse
    {
        try {
            $gateway = $this->payments->driver($driver);
        } catch (InvalidArgumentException) {
            return response()->json(['message' => 'not_found'], 404);
        }

        $callback = $gateway->parseCallback($request);
        if (! $callback) {
            Log::warning('Rejected payment callback', ['driver' => $driver, 'ip' => $request->ip()]);

            return response()->json(['message' => 'invalid_callback'], 400);
        }

        $payment = Payment::query()->where('reference', $callback->reference)->where('gateway', $driver)->first();
        if (! $payment) {
            return response()->json(['message' => 'not_found'], 404);
        }

        match ($callback->status) {
            'paid' => $this->payments->markPaid($payment, $callback->gatewayReference),
            'failed' => $this->payments->markFailed($payment),
            default => null,
        };

        return response()->json(['ok' => true]);
    }
}
