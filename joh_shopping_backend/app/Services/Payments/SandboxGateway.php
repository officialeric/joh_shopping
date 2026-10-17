<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Development driver. With auto_confirm on, payments succeed immediately, which
 * matches the storefront's simulated PIN prompt / 3-D Secure step. With it off,
 * payments stay pending until POST /api/payments/webhooks/sandbox
 * { "reference": "...", "status": "paid" | "failed" } arrives.
 *
 * Refused in production.
 */
class SandboxGateway implements PaymentGateway
{
    public function __construct(private bool $autoConfirm = true) {}

    public function initiate(Payment $payment, array $context): PaymentInitiation
    {
        $this->guardAgainstProduction();

        $action = $payment->method === 'card' ? 'redirect' : 'stk_push';

        if ($this->autoConfirm) {
            return new PaymentInitiation('paid', $action, 'SBX'.Str::upper(Str::random(10)));
        }

        return new PaymentInitiation('pending', $action, 'SBX'.Str::upper(Str::random(10)), null, 'Awaiting sandbox callback');
    }

    public function parseCallback(Request $request): ?PaymentCallback
    {
        $this->guardAgainstProduction();

        $reference = $request->string('reference')->toString();
        $status = $request->string('status')->toString();

        if ($reference === '' || ! in_array($status, ['paid', 'failed'], true)) {
            return null;
        }

        return new PaymentCallback($reference, $status, $request->string('gatewayReference')->toString() ?: null);
    }

    public function refund(Payment $payment, int $amount, string $reason): string
    {
        $this->guardAgainstProduction();

        return 'SBXR'.Str::upper(Str::random(10));
    }

    private function guardAgainstProduction(): void
    {
        if (app()->isProduction()) {
            throw new \RuntimeException('The sandbox payment driver cannot be used in production.');
        }
    }
}
