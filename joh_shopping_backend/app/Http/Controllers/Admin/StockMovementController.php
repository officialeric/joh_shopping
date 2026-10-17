<?php

namespace App\Http\Controllers\Admin;

use App\Http\Resources\StockMovementResource;
use App\Http\Resources\VariantResource;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use App\Services\InventoryService;
use App\Support\StorefrontCache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * The stock ledger (read-only) and manual adjustments.
 *
 * @extends ResourceController<StockMovement>
 */
class StockMovementController extends ResourceController
{
    protected string $noun = 'stock movement';

    public function __construct(private InventoryService $inventory) {}

    protected function model(): string
    {
        return StockMovement::class;
    }

    protected function resource(): string
    {
        return StockMovementResource::class;
    }

    protected function label(Model $model): string
    {
        return $model->product_name;
    }

    protected function searchable(): array
    {
        return ['product_name', 'reason', 'by'];
    }

    protected function sortable(): array
    {
        return ['createdAt' => 'created_at', 'qty' => 'qty', 'type' => 'type'];
    }

    protected function filterable(): array
    {
        return ['type' => 'type', 'productId' => 'product_id', 'variantId' => 'variant_id'];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [];
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Use POST /api/admin/inventory/adjust.'], 405);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return response()->json(['message' => 'The stock ledger is append-only.'], 405);
    }

    public function destroy(string $id): JsonResponse
    {
        return response()->json(['message' => 'The stock ledger is append-only.'], 405);
    }

    public function destroyMany(Request $request): JsonResponse
    {
        return response()->json(['message' => 'The stock ledger is append-only.'], 405);
    }

    public function adjust(Request $request): VariantResource
    {
        $data = $request->validate([
            'productId' => ['required', 'string'],
            'variantId' => ['required', 'string'],
            'type' => ['required', Rule::in(['in', 'out', 'adjustment', 'return'])],
            'qty' => ['required', 'integer', 'not_in:0', 'between:-100000,100000'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $variant = ProductVariant::query()->with('product')
            ->where('product_id', $data['productId'])
            ->findOrFail($data['variantId']);

        $variant = $this->inventory->adjust($variant, $data['type'], $data['qty'], $data['reason']);
        StorefrontCache::flush();

        return new VariantResource($variant);
    }
}
