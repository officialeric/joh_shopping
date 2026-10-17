<?php

use App\Http\Controllers\Account;
use App\Http\Controllers\Admin;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\PaymentWebhookController;
use App\Http\Controllers\Shop\CartController;
use App\Http\Controllers\Shop\CatalogController;
use App\Http\Controllers\Shop\CheckoutController;
use App\Http\Controllers\Shop\ContentController;
use App\Http\Controllers\Shop\EngagementController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Joh Shopping API
|--------------------------------------------------------------------------
|
| JSON uses the frontend's camelCase field names (see types/index.ts).
| SPA auth: GET /sanctum/csrf-cookie, then POST /api/login (customers, web
| guard) or POST /api/admin/login (staff, admin guard).
|
*/

// ---------------------------------------------------------------- Public storefront

Route::get('bootstrap', [CatalogController::class, 'bootstrap']);
Route::get('settings', [ContentController::class, 'settings']);
Route::get('home', [CatalogController::class, 'home']);
Route::get('deals', [ContentController::class, 'deals']);
Route::get('flash-sale', [ContentController::class, 'flashSale']);
Route::get('banners', [ContentController::class, 'banners']);
Route::get('pages', [ContentController::class, 'pages']);
Route::get('pages/{slug}', [ContentController::class, 'page']);
Route::get('shipping/zones', [ContentController::class, 'shippingZones']);
Route::get('shipping/regions', [ContentController::class, 'regions']);
Route::get('pickup-stores', [ContentController::class, 'pickupStores']);

Route::get('categories', [CatalogController::class, 'categories']);
Route::get('brands', [CatalogController::class, 'brands']);
Route::get('catalog/facets', [CatalogController::class, 'facets']);
Route::get('products', [CatalogController::class, 'index']);
Route::get('products/{slug}', [CatalogController::class, 'show']);
Route::get('products/{product}/reviews', [EngagementController::class, 'reviews']);
Route::get('products/{product}/questions', [EngagementController::class, 'questions']);

Route::post('cart/quote', [CartController::class, 'quote']);

Route::middleware('throttle:checkout')->group(function () {
    Route::post('orders', [CheckoutController::class, 'store']);
    Route::post('orders/{number}/retry-payment', [CheckoutController::class, 'retryPayment']);
});
Route::get('orders/lookup/{number}', [CheckoutController::class, 'lookup']);
Route::get('payments/{reference}/status', [CheckoutController::class, 'paymentStatus']);
Route::post('payments/webhooks/{driver}', PaymentWebhookController::class)->name('payments.webhook');

Route::middleware('throttle:forms')->group(function () {
    Route::post('track', [CheckoutController::class, 'track']);
    Route::post('contact', [EngagementController::class, 'contact']);
    Route::post('newsletter', [EngagementController::class, 'subscribe']);
    Route::post('products/{product}/questions', [EngagementController::class, 'askQuestion']);
    Route::post('products/{product}/stock-alerts', [EngagementController::class, 'stockAlert']);
    Route::post('products/{product}/reviews/{review}/helpful', [EngagementController::class, 'markHelpful']);
});

// ---------------------------------------------------------------- Customer auth

Route::middleware('throttle:auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('two-factor-challenge', [AuthController::class, 'twoFactorChallenge']);
    Route::post('register', [AuthController::class, 'register']);
    Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('reset-password', [AuthController::class, 'resetPassword']);
});
Route::get('email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->middleware(['signed', 'throttle:forms'])
    ->name('verification.verify');

// ---------------------------------------------------------------- Customer account

Route::middleware(['auth:sanctum', 'customer'])->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::post('email/verification-notification', [AuthController::class, 'resendVerification'])->middleware('throttle:forms');

    Route::get('user', [Account\ProfileController::class, 'show']);
    Route::put('user/profile', [Account\ProfileController::class, 'update']);
    Route::put('user/password', [Account\ProfileController::class, 'updatePassword']);
    Route::get('user/preferences', [Account\ProfileController::class, 'preferences']);
    Route::put('user/preferences', [Account\ProfileController::class, 'updatePreferences']);
    Route::delete('user', [Account\ProfileController::class, 'destroy']);

    Route::get('account/orders', [Account\OrderController::class, 'index']);
    Route::get('account/orders/{order}', [Account\OrderController::class, 'show']);
    Route::post('account/orders/{order}/cancel', [Account\OrderController::class, 'cancel']);

    Route::apiResource('addresses', Account\AddressController::class)->except('show');

    Route::get('notifications', [Account\NotificationController::class, 'index']);
    Route::post('notifications/read', [Account\NotificationController::class, 'markRead']);

    Route::get('payment-methods', [Account\PaymentMethodController::class, 'index']);
    Route::post('payment-methods', [Account\PaymentMethodController::class, 'store']);
    Route::post('payment-methods/{method}/default', [Account\PaymentMethodController::class, 'makeDefault']);
    Route::delete('payment-methods/{method}', [Account\PaymentMethodController::class, 'destroy']);

    Route::get('returns', [Account\ReturnController::class, 'index']);
    Route::post('returns', [Account\ReturnController::class, 'store']);

    Route::get('account/reviews', [Account\ReviewController::class, 'index']);
    Route::post('products/{product}/reviews', [EngagementController::class, 'submitReview'])->middleware('throttle:forms');

    Route::get('wishlist', [Account\WishlistController::class, 'index']);
    Route::post('wishlist', [Account\WishlistController::class, 'store']);
    Route::post('wishlist/sync', [Account\WishlistController::class, 'sync']);
    Route::delete('wishlist/{product}', [Account\WishlistController::class, 'destroy']);
});

// ---------------------------------------------------------------- Back office

Route::prefix('admin')->group(function () {
    Route::middleware('throttle:auth')->group(function () {
        Route::post('login', [Admin\AuthController::class, 'login']);
        Route::post('forgot-password', [Admin\AuthController::class, 'forgotPassword']);
        Route::post('reset-password', [Admin\AuthController::class, 'resetPassword']);
        Route::post('accept-invite', [Admin\AuthController::class, 'resetPassword']);
    });

    Route::middleware(['auth:admin', 'staff.active'])->group(function () {
        Route::post('logout', [Admin\AuthController::class, 'logout']);
        Route::get('user', [Admin\AuthController::class, 'me']);
        Route::put('user/password', [Admin\AuthController::class, 'changePassword']);

        /**
         * Register CRUD routes for a resource. Reading needs $read or $write;
         * changing needs $write.
         */
        $crud = function (string $uri, string $controller, string $write, ?string $read = null): void {
            $readPerms = $read ? "{$read}|{$write}" : $write;
            Route::middleware("permission:{$readPerms},admin")->group(function () use ($uri, $controller): void {
                Route::get($uri, [$controller, 'index']);
                Route::get("{$uri}/{id}", [$controller, 'show']);
            });
            Route::middleware("permission:{$write},admin")->group(function () use ($uri, $controller): void {
                Route::post($uri, [$controller, 'store']);
                Route::patch("{$uri}/{id}", [$controller, 'update']);
                Route::delete($uri, [$controller, 'destroyMany']);
                Route::delete("{$uri}/{id}", [$controller, 'destroy']);
            });
        };

        // Analytics
        Route::get('analytics/dashboard', [Admin\AnalyticsController::class, 'dashboard'])->middleware('permission:dashboard.view,admin');
        Route::get('analytics/sales', [Admin\AnalyticsController::class, 'sales'])->middleware('permission:reports.view,admin');
        Route::get('analytics/counts', [Admin\AnalyticsController::class, 'counts']);

        // Sales
        Route::middleware('permission:orders.manage,admin')->group(function () {
            Route::post('orders/{order}/status', [Admin\OrderController::class, 'updateStatus']);
            Route::post('orders/{order}/courier', [Admin\OrderController::class, 'assignCourier']);
            Route::post('orders/{order}/imeis', [Admin\OrderController::class, 'assignImeis']);
        });
        $crud('orders', Admin\OrderController::class, 'orders.manage', 'orders.view');

        Route::get('payments-summary', [Admin\PaymentController::class, 'summary'])->middleware('permission:payments.view|payments.refund,admin');
        Route::post('payments/{payment}/refund', [Admin\PaymentController::class, 'refund'])->middleware('permission:payments.refund,admin');
        $crud('payments', Admin\PaymentController::class, 'payments.refund', 'payments.view');

        $crud('returns', Admin\ReturnController::class, 'returns.manage');
        $crud('customers', Admin\CustomerController::class, 'customers.manage');

        // Catalog
        $crud('products', Admin\ProductController::class, 'products.manage');
        $crud('attributes', Admin\AttributeController::class, 'products.manage');
        $crud('categories', Admin\CategoryController::class, 'categories.manage');
        $crud('brands', Admin\BrandController::class, 'categories.manage');
        Route::post('uploads', [Admin\UploadController::class, 'store'])->middleware('permission:products.manage|content.manage,admin');
        Route::get('uploads/file', [Admin\UploadController::class, 'show'])->middleware('permission:products.manage|content.manage,admin');

        Route::post('inventory/adjust', [Admin\StockMovementController::class, 'adjust'])->middleware('permission:inventory.manage,admin');
        $crud('stock-movements', Admin\StockMovementController::class, 'inventory.manage');
        $crud('serials', Admin\SerialController::class, 'inventory.manage');

        // Marketing & content
        $crud('coupons', Admin\CouponController::class, 'promotions.manage');
        $crud('flash-sales', Admin\FlashSaleController::class, 'promotions.manage');
        $crud('banners', Admin\BannerController::class, 'content.manage');
        $crud('pages', Admin\PageController::class, 'content.manage');
        $crud('reviews', Admin\ReviewController::class, 'reviews.manage');
        $crud('questions', Admin\QuestionController::class, 'reviews.manage');

        Route::post('messages/{message}/reply', [Admin\MessageController::class, 'reply'])->middleware('permission:messages.manage,admin');
        $crud('messages', Admin\MessageController::class, 'messages.manage');
        $crud('subscribers', Admin\SubscriberController::class, 'messages.manage');

        // Operations
        $crud('shipping-zones', Admin\ShippingZoneController::class, 'shipping.manage');
        $crud('pickup-stores', Admin\PickupStoreController::class, 'shipping.manage');

        Route::post('staff/{staff}/resend-invite', [Admin\StaffController::class, 'resendInvite'])->middleware('permission:staff.manage,admin');
        $crud('staff', Admin\StaffController::class, 'staff.manage');
        $crud('roles', Admin\RoleController::class, 'roles.manage', 'staff.manage');
        Route::get('activity-actors', [Admin\ActivityLogController::class, 'actors'])->middleware('permission:activity.view,admin');
        $crud('activity', Admin\ActivityLogController::class, 'activity.view');

        Route::get('settings', [Admin\SettingsController::class, 'show'])->middleware('permission:settings.manage,admin');
        Route::put('settings', [Admin\SettingsController::class, 'update'])->middleware('permission:settings.manage,admin');
    });
});
