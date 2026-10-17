<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\FlashSaleItem;
use App\Models\Order;
use App\Models\PickupStore;
use App\Models\Subscriber;
use App\Models\User;
use App\Notifications\NewOrderAlert;
use App\Notifications\OrderPlaced;
use App\Services\Payments\PaymentInitiation;
use App\Services\Payments\PaymentService;
use App\Support\Sequence;
use App\Support\StoreSettings;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

/**
 * Turns a validated checkout into an order: re-prices the cart, reserves stock,
 * records the coupon, then starts payment once the transaction commits.
 */
class CheckoutService
{
    public function __construct(
        private CartPricer $pricer,
        private InventoryService $inventory,
        private PaymentService $payments,
    ) {}

    /**
     * @param  array{
     *     contact: array{name: string, email: string, phone: string},
     *     delivery: string,
     *     address?: array<string, string|null>|null,
     *     pickupStoreId?: string|null,
     *     paymentMethod: string,
     *     payerPhone?: string|null,
     *     cardLast4?: string|null,
     *     notes?: string|null,
     *     lines: list<array{productId: string, variantId: string, qty: int}>,
     *     couponCode?: string|null,
     *     subscribe?: bool,
     * }  $input
     * @return array{order: Order, payment: PaymentInitiation}
     */
    public function place(array $input, ?User $user, string $locale = 'sw'): array
    {
        if (! StoreSettings::paymentMethodEnabled($input['paymentMethod'])) {
            throw ValidationException::withMessages(['paymentMethod' => 'payment_method_unavailable']);
        }

        $order = DB::transaction(function () use ($input, $user, $locale): Order {
            $delivery = $input['delivery'];
            $region = $delivery === 'pickup' ? null : ($input['address']['region'] ?? null);
            $quote = $this->pricer->quote($input['lines'], $input['couponCode'] ?? null, $region, $delivery, lockForUpdate: true);

            $this->assertPlaceable($input, $quote);

            /** @var Coupon|null $coupon */
            $coupon = $quote['coupon'] && ! $quote['couponError']
                ? Coupon::query()->lockForUpdate()->find($quote['coupon']->id)
                : null;
            if ($coupon && $coupon->usage_limit > 0 && $coupon->used >= $coupon->usage_limit) {
                throw ValidationException::withMessages(['couponCode' => 'invalid']);
            }

            $prefix = (string) StoreSettings::get('orderPrefix', 'JOH-');
            $initialStatus = 'pending';

            $order = Order::create([
                'number' => $prefix.Sequence::next('orders', 10240),
                'user_id' => $user?->id,
                'customer_name' => $input['contact']['name'],
                'customer_email' => mb_strtolower($input['contact']['email']),
                'customer_phone' => $input['contact']['phone'],
                'subtotal' => $quote['subtotal'],
                'discount' => $quote['discount'],
                'shipping_fee' => $quote['shipping'] ?? 0,
                'total' => $quote['total'],
                'coupon_code' => $coupon?->code,
                'status' => $initialStatus,
                'payment_status' => 'pending',
                'payment_method' => $input['paymentMethod'],
                'delivery_method' => $delivery,
                'address' => $delivery === 'pickup' ? null : $this->addressSnapshot($input['address'] ?? []),
                'region' => $region,
                'pickup_store_id' => $delivery === 'pickup' ? $input['pickupStoreId'] : null,
                'notes' => $input['notes'] ?? null,
                'locale' => $locale,
            ]);
            $order->addEvent($initialStatus);

            foreach ($quote['items'] as $item) {
                $order->items()->create([
                    'product_id' => $item['productId'],
                    'variant_id' => $item['variantId'],
                    'name' => $item['name'],
                    'variant_label' => $item['variantLabel'],
                    'price' => $item['unitPrice'],
                    'qty' => $item['qty'],
                ]);

                $this->inventory->move($item['variant'], 'out', -$item['qty'], "Order {$order->number}", 'Checkout');
                $item['product']->increment('sold', $item['qty']);

                /** @var FlashSaleItem|null $flash */
                $flash = $item['flashSaleItem'];
                $flash?->increment('sold', $item['qty']);
            }

            $coupon?->increment('used');

            if ($user) {
                $user->forceFill([
                    'orders_count' => $user->orders_count + 1,
                    'total_spent' => $user->total_spent + $order->total,
                    'last_order_at' => now(),
                    'region' => $user->region ?: $region,
                ])->save();
            }

            if (! empty($input['subscribe'])) {
                Subscriber::firstOrCreate(['email' => $order->customer_email], ['source' => 'checkout', 'active' => true]);
            }

            $this->payments->createFor($order, $input['payerPhone'] ?? null, $input['cardLast4'] ?? null);

            return $order;
        });

        $initiation = $this->payments->initiate($order->payment()->firstOrFail(), [
            'payerPhone' => $input['payerPhone'] ?? null,
            'cardLast4' => $input['cardLast4'] ?? null,
        ]);

        $order->refresh()->load(['items', 'events']);
        $this->notify($order, $user);

        return ['order' => $order, 'payment' => $initiation];
    }

    /**
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>  $quote
     */
    private function assertPlaceable(array $input, array $quote): void
    {
        $errors = [];

        foreach ($quote['missing'] as $index) {
            $errors["lines.{$index}"] = 'unavailable';
        }
        if (! $quote['items'] && ! $errors) {
            $errors['lines'] = 'empty_cart';
        }
        foreach ($quote['items'] as $index => $item) {
            if ($item['qty'] > $item['stock']) {
                $errors["lines.{$index}.qty"] = 'out_of_stock';
            }
        }
        if (! empty($input['couponCode']) && $quote['couponError']) {
            $errors['couponCode'] = $quote['couponError'];
        }
        if ($input['delivery'] === 'express' && ! $quote['expressAvailable']) {
            $errors['delivery'] = 'express_unavailable';
        }
        if ($input['delivery'] === 'pickup' && ! PickupStore::whereKey($input['pickupStoreId'] ?? '')->exists()) {
            $errors['pickupStoreId'] = 'invalid';
        }

        if ($errors) {
            throw ValidationException::withMessages($errors);
        }
    }

    /**
     * @param  array<string, string|null>  $address
     * @return array<string, string>
     */
    private function addressSnapshot(array $address): array
    {
        return array_filter([
            'fullName' => $address['fullName'] ?? null,
            'phone' => $address['phone'] ?? null,
            'region' => $address['region'] ?? null,
            'district' => $address['district'] ?? null,
            'street' => $address['street'] ?? null,
            'landmark' => $address['landmark'] ?? null,
        ], fn (?string $value): bool => $value !== null && $value !== '');
    }

    private function notify(Order $order, ?User $user): void
    {
        if ($user) {
            $user->notify(new OrderPlaced($order));
        } else {
            Notification::route('mail', $order->customer_email)->notify(new OrderPlaced($order));
        }

        if (StoreSettings::get('notifyOnNewOrder') && StoreSettings::get('email')) {
            Notification::route('mail', StoreSettings::get('email'))->notify(new NewOrderAlert($order));
        }
    }
}
