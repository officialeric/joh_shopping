<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Trusted proxies
    |--------------------------------------------------------------------------
    |
    | Behind Nginx on the same server use 127.0.0.1; behind Cloudflare or a load
    | balancer use "*". Needed so Laravel sees the visitor's IP (rate limits,
    | activity log) and that the request came over HTTPS.
    |
    */

    'proxies' => env('TRUSTED_PROXIES'),

];
