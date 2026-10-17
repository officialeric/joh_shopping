<?php

use App\Services\Payments\SandboxGateway;

return [

    /*
    |--------------------------------------------------------------------------
    | Payment drivers
    |--------------------------------------------------------------------------
    |
    | Which driver collects each kind of payment. Mobile money covers M-Pesa,
    | Mixx by Yas, Airtel Money, HaloPesa, T-Pesa and AzamPesa. Only the
    | sandbox driver ships today; add the chosen gateway (Selcom, AzamPay or
    | ClickPesa for mobile money; Pesapal or DPO for cards) under "drivers".
    |
    */

    'mobile_money_driver' => env('PAYMENTS_MOBILE_MONEY_DRIVER', 'sandbox'),

    'card_driver' => env('PAYMENTS_CARD_DRIVER', 'sandbox'),

    /*
    | The sandbox never collects money. On production it is off unless you opt
    | in: card and mobile money are hidden at checkout until a real gateway is
    | configured (cash on delivery still works when enabled in Settings).
    */

    'allow_sandbox' => (bool) env('PAYMENTS_ALLOW_SANDBOX', env('APP_ENV') !== 'production'),

    'drivers' => [
        'sandbox' => [
            'class' => SandboxGateway::class,
            // Marks sandbox payments paid at once. Never true on a live store.
            'autoConfirm' => (bool) env('PAYMENTS_SANDBOX_AUTO_CONFIRM', env('APP_ENV') !== 'production'),
        ],
    ],

];
