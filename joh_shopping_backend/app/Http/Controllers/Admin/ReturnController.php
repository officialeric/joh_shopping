<?php

namespace App\Http\Controllers\Admin;

use App\Http\Resources\ReturnRequestResource;
use App\Models\ReturnRequest;
use App\Notifications\ReturnStatusChanged;
use App\Services\Payments\PaymentService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

/**
 * Returns & warranty claims (RMAs). Customers open them; staff progress them.
 *
 * @extends ResourceController<ReturnRequest>
 */
class ReturnController extends ResourceController
{
    public const STATUSES = ['requested', 'approved', 'received', 'repaired', 'refunded', 'rejected', 'completed'];

    protected string $noun = 'return';

    public function __construct(private PaymentService $payments) {}

    protected function model(): string
    {
        return ReturnRequest::class;
    }

    protected function resource(): string
    {
        return ReturnRequestResource::class;
    }

    protected function label(Model $model): string
    {
        return "{$model->number} → {$model->status}";
    }

    protected function withRelations(Builder $query): Builder
    {
        return $query->with(['order.items', 'order.payment']);
    }

    protected function searchable(): array
    {
        return ['number', 'customer_name', 'product_name', 'imei'];
    }

    protected function sortable(): array
    {
        return ['createdAt' => 'created_at', 'updatedAt' => 'updated_at', 'status' => 'status', 'number' => 'number', 'customerName' => 'customer_name'];
    }

    protected function filterable(): array
    {
        return ['status' => 'status', 'type' => 'type', 'resolution' => 'resolution'];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [
            'status' => ['required', Rule::in(self::STATUSES)],
            'resolution' => ['nullable', Rule::in(['refund', 'replacement', 'repair'])],
            'refundAmount' => ['nullable', 'integer', 'min:1'],
        ];
    }

    /**
     * Moving a return to "refunded" refunds the order's payment once, so
     * revenue and the payments ledger reflect it.
     *
     * @param  ReturnRequest  $model
     */
    protected function fill(Model $model, array $data): void
    {
        $amount = $data['refundAmount'] ?? null;
        unset($data['refundAmount']);

        if (($data['status'] ?? null) === 'refunded' && $model->status !== 'refunded' && $model->refund_amount === null) {
            $amount ??= $model->suggestedRefund();
            $payment = $model->order->payment;

            if (! $payment || $model->refundable() === 0) {
                throw ValidationException::withMessages(['refundAmount' => 'refund_unpaid']);
            }

            try {
                $this->payments->refund($payment->setRelation('order', $model->order), $amount, "{$model->number}: {$model->product_name}");
            } catch (InvalidArgumentException) {
                throw ValidationException::withMessages(['refundAmount' => 'invalid_amount']);
            }

            $model->refund_amount = $amount;
            $data['resolution'] ??= 'refund';
        }

        parent::fill($model, $data);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Customers open returns from their account.'], 405);
    }

    /**
     * @param  ReturnRequest  $model
     */
    protected function afterSave(Model $model, array $data, bool $created): void
    {
        if (! $model->wasChanged('status')) {
            return;
        }

        $notification = new ReturnStatusChanged($model);
        $model->user
            ? $model->user->notify($notification)
            : Notification::route('mail', $model->order->customer_email)->notify($notification);
    }
}
