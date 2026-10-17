<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * The signed-in customer's orders.
 */
class OrderController extends Controller
{
    public function __construct(private OrderService $orders) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = $this->mine($request)->with(['items', 'events'])->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return OrderResource::collection(
            $request->has('page') ? $query->paginate(min(50, (int) $request->query('perPage', 10))) : $query->get()
        );
    }

    /**
     * Look up by id or order number.
     */
    public function show(Request $request, string $order): OrderResource
    {
        return new OrderResource(
            $this->mine($request)->with(['items', 'events'])
                ->where(fn ($query) => $query->whereKey($order)->orWhere('number', mb_strtoupper($order)))
                ->firstOrFail()
        );
    }

    public function cancel(Request $request, string $order): OrderResource
    {
        $model = $this->mine($request)->with(['items.product', 'events', 'user'])->findOrFail($order);

        return new OrderResource($this->orders->cancelByCustomer($model));
    }

    /**
     * @return Builder<Order>
     */
    private function mine(Request $request)
    {
        /** @var User $user */
        $user = $request->user();

        return Order::query()->where('user_id', $user->id);
    }
}
