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

    'drivers' => [
        'sandbox' => [
            'class' => SandboxGateway::class,
            'autoConfirm' => (bool) env('PAYMENTS_SANDBOX_AUTO_CONFIRM', true),
        ],
    ],

];
