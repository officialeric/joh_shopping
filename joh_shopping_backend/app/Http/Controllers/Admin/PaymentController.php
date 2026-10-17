<?php

namespace App\Http\Controllers\Admin;

use App\Http\Resources\PaymentResource;
use App\Models\Order;
use App\Models\Payment;
use App\Services\Payments\PaymentService;
use App\Support\ActivityLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

/**
 * Read-only payment ledger plus refunds.
 *
 * @extends ResourceController<Payment>
 */
class PaymentController extends ResourceController
{
    protected string $noun = 'payment';

    public function __construct(private PaymentService $payments) {}

    protected function model(): string
    {
        return Payment::class;
    }

    protected function resource(): string
    {
        return PaymentResource::class;
    }

    protected function label(Model $model): string
    {
        return $model->reference;
    }

    protected function withRelations(Builder $query): Builder
    {
        return $query->with('order');
    }

    protected function sortable(): array
    {
        $byOrder = fn (string $column) => fn (Builder $query, string $direction) => $query->orderBy(
            Order::select($column)->whereColumn('orders.id', 'payments.order_id'),
            $direction,
        );

        return [
            'createdAt' => 'created_at',
            'amount' => 'amount',
            'refunded' => 'refunded',
            'status' => 'status',
            'method' => 'method',
            'orderNumber' => $byOrder('number'),
            'customerName' => $byOrder('customer_name'),
        ];
    }

    protected function filterable(): array
    {
        return ['status' => 'status', 'method' => 'method', 'orderId' => 'order_id', 'gateway' => 'gateway'];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [];
    }

    protected function applySearch(Builder $query, string $search): void
    {
        if ($search === '') {
            return;
        }

        $needle = '%'.mb_strtolower($search).'%';
        $query->where(fn (Builder $query) => $query
            ->whereRaw('LOWER(reference) LIKE ?', [$needle])
            ->orWhereRaw('LOWER(payer_phone) LIKE ?', [$needle])
            ->orWhereHas('order', fn (Builder $order) => $order
                ->whereRaw('LOWER(number) LIKE ?', [$needle])
                ->orWhereRaw('LOWER(customer_name) LIKE ?', [$needle])));
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Payments are created through checkout.'], 405);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return response()->json(['message' => 'Use the refund action.'], 405);
    }

    protected function ensureDeletable(Model $model): void
    {
        throw ValidationException::withMessages(['id' => 'payments_cannot_be_deleted']);
    }

    /**
     * Totals for the payments page: collected, pending, failed and refunded TZS.
     */
    public function summary(): JsonResponse
    {
        $sum = fn (array $statuses) => (int) Payment::query()->whereIn('status', $statuses)->sum('amount');

        return response()->json(['data' => [
            'collected' => $sum(['paid', 'partially_refunded']),
            'pending' => $sum(['pending']),
            'failed' => $sum(['failed']),
            'refunded' => (int) Payment::query()->sum('refunded'),
        ]]);
    }

    public function refund(Request $request, Payment $payment): PaymentResource
    {
        $data = $request->validate([
            'amount' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        try {
            $payment = $this->payments->refund($payment->load('order'), $data['amount'], $data['reason']);
        } catch (InvalidArgumentException) {
            throw ValidationException::withMessages(['amount' => 'invalid_amount']);
        }

        ActivityLogger::log('refunded payment', "{$payment->order->number} (".number_format($data['amount']).' TZS)');

        return new PaymentResource($payment->load('order'));
    }
}
