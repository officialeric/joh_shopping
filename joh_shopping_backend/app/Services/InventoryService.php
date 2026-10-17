<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Serial;
use App\Models\StockAlert;
use App\Models\StockMovement;
use App\Notifications\BackInStock;
use App\Notifications\LowStockAlert;
use App\Support\ActivityLogger;
use App\Support\StoreSettings;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

/**
 * Stock levels, the movement ledger, IMEI registry and stock notifications.
 */
class InventoryService
{
    /**
     * Apply a signed quantity change to a variant and record it in the ledger.
     */
    public function move(ProductVariant $variant, string $type, int $delta, string $reason, ?string $by = null): StockMovement
    {
        $product = $variant->product;
        $before = $variant->stock;
        $variant->stock = max(0, $before + $delta);
        $variant->save();

        $movement = StockMovement::create([
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'product_name' => $product->name,
            'variant_label' => $product->variantLabel($variant, 'en'),
            'type' => $type,
            'qty' => $delta,
            'reason' => $reason,
            'by' => $by ?? ActivityLogger::actorName(),
            'staff_id' => Auth::guard('admin')->id(),
        ]);

        DB::afterCommit(function () use ($product, $variant, $before): void {
            $this->afterStockChange($product, $variant, $before);
        });

        return $movement;
    }

    /**
     * Manual adjustment from Admin → Inventory. "out" always removes, "in" and
     * "return" always add, "adjustment" applies the signed quantity as given.
     */
    public function adjust(ProductVariant $variant, string $type, int $qty, string $reason): ProductVariant
    {
        $delta = match ($type) {
            'out' => -abs($qty),
            'adjustment' => $qty,
            default => abs($qty),
        };

        DB::transaction(function () use ($variant, $type, $delta, $reason): void {
            $locked = ProductVariant::query()->with('product')->lockForUpdate()->findOrFail($variant->id);
            $this->move($locked, $type, $delta, $reason);
        });

        $variant->refresh();
        ActivityLogger::log('adjusted stock', "{$variant->product->name} (".($delta > 0 ? '+' : '')."{$delta})");

        return $variant;
    }

    public function registerSerial(Product $product, string $variantLabel, string $imei): Serial
    {
        $serial = Serial::create([
            'imei' => $imei,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant_label' => $variantLabel,
            'status' => 'in_stock',
            'received_at' => now(),
        ]);

        ActivityLogger::log('registered IMEI', "{$product->name} · {$imei}");

        return $serial;
    }

    private function afterStockChange(Product $product, ProductVariant $variant, int $before): void
    {
        $threshold = $product->low_stock_threshold ?: (int) StoreSettings::get('lowStockAlert', 5);

        if ($before > $threshold && $variant->stock <= $threshold && StoreSettings::get('notifyOnLowStock') && StoreSettings::get('email')) {
            Notification::route('mail', StoreSettings::get('email'))->notify(new LowStockAlert($product, $variant));
        }

        if ($before <= 0 && $variant->stock > 0) {
            StockAlert::query()->where('product_id', $product->id)->whereNull('notified_at')->get()
                ->each(function (StockAlert $alert) use ($product): void {
                    Notification::route('mail', $alert->email)->notify(new BackInStock($product));
                    $alert->forceFill(['notified_at' => now()])->save();
                });
        }
    }
}
