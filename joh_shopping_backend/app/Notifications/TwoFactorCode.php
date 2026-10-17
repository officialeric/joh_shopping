<?php

namespace App\Notifications;

use App\Notifications\Concerns\Bilingual;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * One-time sign-in code for customers with two-step verification on.
 * Sent synchronously so the code arrives while the customer waits.
 */
class TwoFactorCode extends Notification
{
    use Bilingual, Queueable;

    public function __construct(public string $code) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject($this->pick("Nambari yako ya kuingia: {$this->code}", "Your sign-in code: {$this->code}"))
            ->line($this->pick(
                "Tumia nambari {$this->code} kukamilisha kuingia. Inaisha baada ya dakika 10.",
                "Use {$this->code} to finish signing in. It expires in 10 minutes."
            ))
            ->line($this->pick(
                'Kama hukujaribu kuingia, badilisha nenosiri lako mara moja.',
                "If this wasn't you, change your password right away."
            ));
    }
}
