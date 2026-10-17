<?php

namespace App\Services\Payments;

/**
 * A verified provider notification about one of our payments.
 */
final readonly class PaymentCallback
{
    public function __construct(
        public string $reference,
        public string $status,
        public ?string $gatewayReference = null,
    ) {}
}
