<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells the store about a new order (Settings → notify on new order).
 */
class NewOrderAlert extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Order $order)
    {
        $this->afterCommit();
    }

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
            ->subject("New order {$this->order->number} — TSh ".number_format($this->order->total))
            ->line("{$this->order->customer_name} ({$this->order->customer_phone}) placed an order.")
            ->line("Payment: {$this->order->payment_method} ({$this->order->payment_status}). Delivery: {$this->order->delivery_method}.")
            ->action('Open in admin', rtrim((string) config('app.frontend_url'), '/')."/sw/admin/orders/{$this->order->id}");
    }
}
