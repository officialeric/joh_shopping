<?php

namespace App\Notifications;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells the store a variant fell to its low-stock threshold.
 */
class LowStockAlert extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Product $product, public ProductVariant $variant) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $label = $this->product->variantLabel($this->variant, 'en');

        return (new MailMessage)
            ->subject("Low stock: {$this->product->name}")
            ->line("{$this->product->name} ({$label}) has {$this->variant->stock} left.")
            ->action('Open inventory', rtrim((string) config('app.frontend_url'), '/').'/sw/admin/inventory');
    }
}
