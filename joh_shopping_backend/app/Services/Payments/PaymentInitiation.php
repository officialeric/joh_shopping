<?php

namespace App\Services\Payments;

/**
 * Result of starting a payment.
 *
 * status: "paid" (captured now), "pending" (await callback), or "failed".
 * action: what the storefront should show: "none", "stk_push" (approve on phone) or "redirect".
 */
final readonly class PaymentInitiation
{
    public function __construct(
        public string $status,
        public string $action = 'none',
        public ?string $gatewayReference = null,
        public ?string $redirectUrl = null,
        public ?string $message = null,
    ) {}

    /**
     * @return array{status: string, action: string, redirectUrl: string|null, message: string|null}
     */
    public function toArray(): array
    {
        return [
            'status' => $this->status,
            'action' => $this->action,
            'redirectUrl' => $this->redirectUrl,
            'message' => $this->message,
        ];
    }
}
