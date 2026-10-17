<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Tells the Next.js storefront to refresh its cached catalog after admin edits
 * (POST {FRONTEND_URL}/api/revalidate). Runs after the response is sent and
 * never fails the request. Disabled when STOREFRONT_REVALIDATE_SECRET is empty.
 */
class StorefrontCache
{
    private static bool $queued = false;

    public static function flush(): void
    {
        $secret = config('app.storefront_revalidate_secret');
        if (! $secret || self::$queued) {
            return;
        }
        self::$queued = true;

        defer(function () use ($secret): void {
            self::$queued = false;

            try {
                Http::timeout(5)
                    ->withHeaders(['X-Revalidate-Secret' => $secret])
                    ->post(config('app.storefront_revalidate_url'), ['tag' => 'catalog']);
            } catch (Throwable $e) {
                Log::warning('Storefront revalidation failed', ['error' => $e->getMessage()]);
            }
        });
    }
}
