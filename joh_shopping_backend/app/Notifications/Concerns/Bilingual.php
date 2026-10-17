<?php

namespace App\Notifications\Concerns;

use App\Models\User;
use Illuminate\Support\Facades\App;

/**
 * Helpers for notifications sent in Swahili or English.
 */
trait Bilingual
{
    protected function pick(string $sw, string $en): string
    {
        return App::getLocale() === 'en' ? $en : $sw;
    }

    /**
     * Mail for anyone; mail + in-app for signed-up customers.
     *
     * @return list<string>
     */
    protected function customerChannels(object $notifiable): array
    {
        return $notifiable instanceof User ? ['mail', 'database'] : ['mail'];
    }

    protected function frontendUrl(string $path, ?string $locale = null): string
    {
        $locale ??= App::getLocale() === 'en' ? 'en' : 'sw';

        return rtrim((string) config('app.frontend_url'), '/')."/{$locale}".$path;
    }

    protected static function tzs(int $amount): string
    {
        return 'TSh '.number_format($amount);
    }
}
