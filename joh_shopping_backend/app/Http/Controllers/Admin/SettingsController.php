<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Support\ActivityLogger;
use App\Support\StorefrontCache;
use App\Support\StoreSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Admin → Settings.
 */
class SettingsController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => StoreSettings::all()]);
    }

    public function update(Request $request): JsonResponse
    {
        $rules = [
            'storeName' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => ['sometimes', 'required', 'email'],
            'phone' => ['sometimes', 'required', 'string', 'max:30'],
            'whatsapp' => ['sometimes', 'nullable', 'string', 'max:30'],
            'address' => ['sometimes', 'required', 'string', 'max:255'],
            'currency' => ['sometimes', Rule::in(['TZS'])],
            'vatRate' => ['sometimes', 'numeric', 'between:0,100'],
            'pricesIncludeVat' => ['sometimes', 'boolean'],
            'defaultLocale' => ['sometimes', Rule::in(['sw', 'en'])],
            'paymentMethods' => ['sometimes', 'array'],
            'lowStockAlert' => ['sometimes', 'integer', 'min:0'],
            'orderPrefix' => ['sometimes', 'required', 'string', 'max:10', 'regex:/^[A-Z0-9-]+$/'],
            'maintenanceMode' => ['sometimes', 'boolean'],
            'notifyOnNewOrder' => ['sometimes', 'boolean'],
            'notifyOnLowStock' => ['sometimes', 'boolean'],
        ];
        foreach (Order::PAYMENT_METHODS as $method) {
            $rules["paymentMethods.{$method}"] = ['sometimes', 'boolean'];
        }

        $data = $request->validate($rules);
        if (isset($data['paymentMethods'])) {
            $data['paymentMethods'] = [...StoreSettings::all()['paymentMethods'], ...collect($data['paymentMethods'])->only(Order::PAYMENT_METHODS)->all()];
        }

        $settings = StoreSettings::save($data);
        ActivityLogger::log('updated settings', 'Store settings');
        StorefrontCache::flush();

        return response()->json(['data' => $settings]);
    }
}
