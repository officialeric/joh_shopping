<?php

namespace App\Http\Controllers\Admin;

use App\Http\Resources\SerialResource;
use App\Models\Product;
use App\Models\Serial;
use App\Services\InventoryService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * IMEI registry.
 *
 * @extends ResourceController<Serial>
 */
class SerialController extends ResourceController
{
    protected string $noun = 'IMEI';

    protected string $defaultSort = '-receivedAt';

    public function __construct(private InventoryService $inventory) {}

    protected function model(): string
    {
        return Serial::class;
    }

    protected function resource(): string
    {
        return SerialResource::class;
    }

    protected function label(Model $model): string
    {
        return "{$model->product_name} · {$model->imei}";
    }

    protected function searchable(): array
    {
        return ['imei', 'product_name', 'order_number', 'customer_name'];
    }

    protected function sortable(): array
    {
        return ['receivedAt' => 'received_at', 'soldAt' => 'sold_at', 'createdAt' => 'created_at', 'status' => 'status', 'imei' => 'imei', 'productName' => 'product_name'];
    }

    protected function filterable(): array
    {
        return ['status' => 'status', 'productId' => 'product_id'];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [
            'status' => ['required', Rule::in(['in_stock', 'sold', 'returned', 'defective'])],
        ];
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'productId' => ['required', 'string', 'exists:products,id'],
            'variantLabel' => ['required', 'string', 'max:120'],
            'imei' => ['required', 'regex:/^\d{15}$/', Rule::unique('serials', 'imei')],
        ], ['imei.unique' => 'duplicate']);

        $serial = $this->inventory->registerSerial(Product::findOrFail($data['productId']), $data['variantLabel'], $data['imei']);

        return (new SerialResource($serial))->response()->setStatusCode(201);
    }
}
