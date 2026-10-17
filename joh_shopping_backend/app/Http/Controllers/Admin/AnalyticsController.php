<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function __construct(private AnalyticsService $analytics) {}

    public function dashboard(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->analytics->dashboard($this->days($request))]);
    }

    public function sales(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->analytics->sales($this->days($request))]);
    }

    /**
     * Sidebar badge counts.
     */
    public function counts(): JsonResponse
    {
        $counts = $this->analytics->attention();

        return response()->json(['data' => [
            'orders' => $counts['pendingOrders'],
            'returns' => $counts['pendingReturns'],
            'reviews' => $counts['pendingReviews'],
            'messages' => $counts['unreadMessages'],
        ]]);
    }

    private function days(Request $request): int
    {
        return min(365, max(1, (int) $request->query('days', 30)));
    }
}
