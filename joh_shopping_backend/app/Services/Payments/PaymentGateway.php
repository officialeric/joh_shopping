<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Http\Request;

/**
 * A payment provider driver. Mobile money (STK/USSD push) and cards (hosted
 * 3-D Secure page) both fit: initiate, then confirm via callback or poll.
 *
 * To add Selcom, AzamPay, ClickPesa, Pesapal or DPO: implement this interface,
 * register it in config/payments.php and point the provider's callback URL at
 * POST /api/payments/webhooks/{driver}.
 */
interface PaymentGateway
{
    /**
     * Start collecting the payment.
     *
     * @param  array{payerPhone?: string|null, cardLast4?: string|null, returnUrl?: string|null}  $context
     */
    public function initiate(Payment $payment, array $context): PaymentInitiation;

    /**
     * Parse and verify a provider callback. Return null if it is not authentic.
     */
    public function parseCallback(Request $request): ?PaymentCallback;

    /**
     * Refund part or all of a captured payment. Returns the provider's refund reference.
     */
    public function refund(Payment $payment, int $amount, string $reason): string;
}
