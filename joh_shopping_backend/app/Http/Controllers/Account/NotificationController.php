<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * In-app notifications (Laravel database notifications).
 */
class NotificationController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return NotificationResource::collection($request->user()->notifications()->limit(100)->get())
            ->additional(['meta' => ['unread' => $request->user()->unreadNotifications()->count()]]);
    }

    /**
     * Mark some (ids) or all notifications as read.
     */
    public function markRead(Request $request): JsonResponse
    {
        $data = $request->validate(['ids' => ['sometimes', 'array'], 'ids.*' => ['string']]);

        $query = $request->user()->unreadNotifications();
        if (isset($data['ids'])) {
            $query->whereIn('id', $data['ids']);
        }
        $query->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }
}
