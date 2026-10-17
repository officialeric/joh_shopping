<?php

namespace App\Notifications;

use App\Models\Order;
use App\Notifications\Concerns\Bilingual;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Notification as Notifier;

class OrderStatusChanged extends Notification implements ShouldQueue
{
    use Bilingual, Queueable;

    /**
     * Status → [Swahili, English] message shown to the customer.
     */
    private const MESSAGES = [
        'confirmed' => ['Oda yako imethibitishwa na inaandaliwa.', 'Your order is confirmed and being prepared.'],
        'packed' => ['Oda yako imefungwa tayari kusafirishwa.', 'Your order is packed and ready to ship.'],
        'shipped' => ['Oda yako imesafirishwa.', 'Your order has shipped.'],
        'out_for_delivery' => ['Oda yako iko njiani, msafirishaji atakupigia.', 'Your order is out for delivery; the courier will call you.'],
        'delivered' => ['Oda yako imefika. Asante kwa kununua nasi!', 'Your order was delivered. Thank you for shopping with us!'],
        'cancelled' => ['Oda yako imesitishwa. Kama ulilipa, utarejeshewa pesa.', 'Your order was cancelled. If you paid, you will be refunded.'],
        'returned' => ['Bidhaa yako imerudishwa.', 'Your return has been received.'],
    ];

    public function __construct(public Order $order, public string $status)
    {
        $this->locale($order->locale);
        $this->afterCommit();
    }

    /**
     * Notify the order's customer (account or guest email) about its current status.
     */
    public static function dispatchFor(Order $order): void
    {
        if (! array_key_exists($order->status, self::MESSAGES)) {
            return;
        }

        $notification = new self($order, $order->status);

        if ($order->user) {
            $order->user->notify($notification);
        } else {
            Notifier::route('mail', $order->customer_email)->notify($notification);
        }
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
        [$sw, $en] = self::MESSAGES[$this->status];

        return (new MailMessage)
            ->subject($this->pick("Taarifa ya oda {$this->order->number}", "Update on order {$this->order->number}"))
            ->greeting($this->pick("Habari {$this->order->customer_name},", "Hi {$this->order->customer_name},"))
            ->line($this->pick($sw, $en))
            ->when($this->order->courier && in_array($this->status, ['shipped', 'out_for_delivery'], true), fn (MailMessage $mail) => $mail->line(
                $this->pick('Msafirishaji: ', 'Courier: ')."{$this->order->courier['name']} · {$this->order->courier['trackingNumber']}"
            ))
            ->action($this->pick('Fuatilia oda', 'Track your order'), $this->frontendUrl("/track-order?number={$this->order->number}"));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        [$sw, $en] = self::MESSAGES[$this->status];

        return [
            'type' => 'order',
            'title' => ['sw' => "Oda {$this->order->number}", 'en' => "Order {$this->order->number}"],
            'body' => ['sw' => $sw, 'en' => $en],
            'href' => "/account/orders/{$this->order->id}",
        ];
    }
}
