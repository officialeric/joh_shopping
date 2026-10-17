<?php

namespace App\Http\Controllers\Admin;

use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use App\Support\ActivityLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Orders are created at checkout; staff move them through fulfilment here.
 *
 * @extends ResourceController<Order>
 */
class OrderController extends ResourceController
{
    protected string $noun = 'order';

    public function __construct(private OrderService $orders) {}

    protected function model(): string
    {
        return Order::class;
    }

    protected function resource(): string
    {
        return OrderResource::class;
    }

    protected function label(Model $model): string
    {
        return $model->number;
    }

    protected function withRelations(Builder $query): Builder
    {
        return $query->with(['items', 'events']);
    }

    protected function searchable(): array
    {
        return ['number', 'customer_name', 'customer_phone', 'customer_email'];
    }

    protected function sortable(): array
    {
        return ['createdAt' => 'created_at', 'total' => 'total', 'number' => 'number', 'status' => 'status', 'customerName' => 'customer_name'];
    }

    protected function filterable(): array
    {
        return [
            'status' => 'status',
            'paymentStatus' => 'payment_status',
            'paymentMethod' => 'payment_method',
            'deliveryMethod' => 'delivery_method',
            'region' => 'region',
            'customerId' => fn (Builder $query, string $value) => $value === 'guest' ? $query->whereNull('user_id') : $query->where('user_id', $value),
            'open' => fn (Builder $query, string $value) => $value === 'true' ? $query->whereIn('status', ['pending', 'confirmed']) : $query,
        ];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Orders are created through checkout.'], 405);
    }

    protected function ensureDeletable(Model $model): void
    {
        if ($model->status !== 'cancelled') {
            throw ValidationException::withMessages(['id' => 'only_cancelled_orders_can_be_deleted']);
        }
    }

    public function updateStatus(Request $request, Order $order): OrderResource
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(Order::STATUSES)],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $order->load(['items.product', 'events']);
        $this->orders->updateStatus($order, $data['status'], $data['note'] ?? null);
        ActivityLogger::log('updated order status', "{$order->number} → {$data['status']}");

        return new OrderResource($order);
    }

    public function assignCourier(Request $request, Order $order): OrderResource
    {
        $courier = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'trackingNumber' => ['required', 'string', 'max:60'],
            'phone' => ['required', 'string', 'max:30'],
        ]);

        return new OrderResource($this->orders->assignCourier($order, $courier));
    }

    public function assignImeis(Request $request, Order $order): OrderResource
    {
        $data = $request->validate([
            'imeis' => ['required', 'array'],
            'imeis.*' => ['array'],
            'imeis.*.*' => ['nullable', 'regex:/^\d{15}$/'],
        ]);

        $order->load('items');

        return new OrderResource($this->orders->assignImeis($order, $data['imeis']));
    }
}
