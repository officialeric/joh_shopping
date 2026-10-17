<?php

namespace App\Notifications;

use App\Models\Product;
use App\Notifications\Concerns\Bilingual;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class BackInStock extends Notification implements ShouldQueue
{
    use Bilingual, Queueable;

    public function __construct(public Product $product) {}

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
            ->subject("{$this->product->name} — ".$this->pick('imerudi stoo', 'back in stock'))
            ->line($this->pick(
                "Habari njema! {$this->product->name} sasa inapatikana tena.",
                "Good news! {$this->product->name} is available again."
            ))
            ->action($this->pick('Nunua sasa', 'Shop now'), $this->frontendUrl("/products/{$this->product->slug}"));
    }
}
