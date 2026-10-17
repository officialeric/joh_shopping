<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\Payment;
use App\Notifications\OrderStatusChanged;
use App\Support\ActivityLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Owns payment state. Gateways only talk to providers; every status change
 * (paid, failed, refunded) and its effect on the order goes through here.
 */
class PaymentService
{
    public function gatewayFor(string $method): PaymentGateway
    {
        return $this->driver($this->driverNameFor($method));
    }

    public function driverNameFor(string $method): string
    {
        return $method === 'card'
            ? config('payments.card_driver', 'sandbox')
            : config('payments.mobile_money_driver', 'sandbox');
    }

    public function driver(string $name): PaymentGateway
    {
        $config = config("payments.drivers.{$name}");
        if (! is_array($config) || ! isset($config['class'])) {
            throw new InvalidArgumentException("Unknown payment driver [{$name}].");
        }

        return app()->make($config['class'], collect($config)->except('class')->all());
    }

    /**
     * Create a payment row for an order (inside the checkout transaction).
     */
    public function createFor(Order $order, ?string $payerPhone, ?string $cardLast4): Payment
    {
        $prefix = match (true) {
            $order->payment_method === 'card' => 'CRD',
            $order->payment_method === 'cod' => 'COD',
            default => Str::upper(substr($order->payment_method, 0, 3)),
        };

        return $order->payments()->create([
            'reference' => $prefix.Str::upper(Str::random(12)),
            'method' => $order->payment_method,
            'gateway' => $order->payment_method === 'cod' ? 'cod' : $this->driverNameFor($order->payment_method),
            'amount' => $order->total,
            'status' => 'pending',
            'payer_phone' => $payerPhone,
            'card_last4' => $cardLast4,
        ]);
    }

    /**
     * Ask the gateway to collect. Cash on delivery is collected by the courier.
     *
     * @param  array{payerPhone?: string|null, cardLast4?: string|null, returnUrl?: string|null}  $context
     */
    public function initiate(Payment $payment, array $context = []): PaymentInitiation
    {
        if ($payment->method === 'cod') {
            return new PaymentInitiation('pending', 'none', null, null, 'Pay the courier on delivery');
        }

        $initiation = $this->gatewayFor($payment->method)->initiate($payment, $context);

        $payment->forceFill(['gateway_reference' => $initiation->gatewayReference ?? $payment->gateway_reference])->save();

        match ($initiation->status) {
            'paid' => $this->markPaid($payment, $initiation->gatewayReference),
            'failed' => $this->markFailed($payment),
            default => null,
        };

        return $initiation;
    }

    public function markPaid(Payment $payment, ?string $gatewayReference = null): void
    {
        DB::transaction(function () use ($payment, $gatewayReference): void {
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            if ($payment->status === 'paid') {
                return;
            }

            $payment->forceFill([
                'status' => 'paid',
                'paid_at' => now(),
                'gateway_reference' => $gatewayReference ?? $payment->gateway_reference,
            ])->save();

            $order = $payment->order()->lockForUpdate()->firstOrFail();
            $order->payment_status = 'paid';
            if ($order->status === 'pending') {
                $order->status = 'confirmed';
                $order->addEvent('confirmed', 'Payment received');
            }
            $order->save();

            DB::afterCommit(fn () => OrderStatusChanged::dispatchFor($order->fresh()));
        });
    }

    public function markFailed(Payment $payment): void
    {
        DB::transaction(function () use ($payment): void {
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            if ($payment->status !== 'pending') {
                return;
            }

            $payment->forceFill(['status' => 'failed'])->save();
            $payment->order()->update(['payment_status' => 'failed']);
        });
    }

    /**
     * Refund part or all of a payment and reflect it on the order.
     */
    public function refund(Payment $payment, int $amount, string $reason, ?string $by = null): Payment
    {
        $refundable = $payment->amount - $payment->refunded;
        if ($payment->status === 'pending' || $payment->status === 'failed' || $amount <= 0 || $amount > $refundable) {
            throw new InvalidArgumentException('invalid_amount');
        }

        $refundReference = $payment->method === 'cod'
            ? 'CASH-'.Str::upper(Str::random(8))
            : $this->driver($payment->gateway)->refund($payment, $amount, $reason);

        return DB::transaction(function () use ($payment, $amount, $reason, $by, $refundReference): Payment {
            $payment->refunded += $amount;
            $payment->status = $payment->refunded >= $payment->amount ? 'refunded' : 'partially_refunded';
            $payment->meta = [...($payment->meta ?? []), 'refunds' => [
                ...($payment->meta['refunds'] ?? []),
                ['amount' => $amount, 'reason' => $reason, 'reference' => $refundReference, 'at' => now()->toIso8601ZuluString()],
            ]];
            $payment->save();

            $order = $payment->order;
            $order->update(['payment_status' => $payment->status]);
            $order->addEvent($order->status, 'Refund '.number_format($amount).' TZS — '.$reason, $by ?? ActivityLogger::actorName());

            return $payment;
        });
    }
}
