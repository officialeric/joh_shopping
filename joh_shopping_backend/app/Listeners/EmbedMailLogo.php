<?php

namespace App\Listeners;

use Illuminate\Mail\Events\MessageSending;

/**
 * The mail header shows the logo as `cid:joh-logo`. Attaching it inline
 * (instead of linking to a URL) means it renders in Gmail and others even
 * while the store runs on localhost, and without "load images" prompts.
 */
class EmbedMailLogo
{
    public const CID = 'joh-logo';

    public function handle(MessageSending $event): void
    {
        $html = $event->message->getHtmlBody();
        $logo = public_path('brand/email-logo.png');

        if (! is_string($html) || ! str_contains($html, 'cid:'.self::CID) || ! is_file($logo)) {
            return;
        }

        $event->message->embedFromPath($logo, self::CID, 'image/png');
    }
}
