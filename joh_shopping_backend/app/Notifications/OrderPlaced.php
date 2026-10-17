<?php

namespace App\Notifications;

use App\Models\Order;
use App\Notifications\Concerns\Bilingual;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderPlaced extends Notification implements ShouldQueue
{
    use Bilingual, Queueable;

    public function __construct(public Order $order)
    {
        $this->locale($order->locale);
        $this->afterCommit();
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return $this->customerChannels($notifiable);
    }

    public function toMail(object $notifiable): MailMessage
    {
        $order = $this->order->loadMissing('items');
        $mail = (new MailMessage)
            ->subject($this->pick("Tumepokea oda yako {$order->number}", "We received your order {$order->number}"))
            ->greeting($this->pick("Habari {$order->customer_name},", "Hi {$order->customer_name},"))
            ->line($this->pick('Asante kwa kununua Joh Shopping. Muhtasari wa oda yako:', 'Thank you for shopping with Joh Shopping. Your order summary:'));

        foreach ($order->items as $item) {
            $mail->line("• {$item->name} ({$item->variant_label}) × {$item->qty} — ".self::tzs($item->price * $item->qty));
        }

        return $mail
            ->line($this->pick('Jumla: ', 'Total: ').self::tzs($order->total))
            ->action($this->pick('Fuatilia oda', 'Track your order'), $this->frontendUrl("/track-order?number={$order->number}"));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'order',
            'title' => ['sw' => "Oda {$this->order->number} imepokelewa", 'en' => "Order {$this->order->number} received"],
            'body' => [
                'sw' => 'Tumepokea oda yako ya '.self::tzs($this->order->total).'. Tutakujulisha ikisafirishwa.',
                'en' => 'We received your order of '.self::tzs($this->order->total).". We'll let you know when it ships.",
            ],
            'href' => "/account/orders/{$this->order->id}",
        ];
    }
}
