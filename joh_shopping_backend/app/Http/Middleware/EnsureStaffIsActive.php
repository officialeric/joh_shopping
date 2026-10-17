<?php

namespace App\Http\Middleware;

use App\Models\Staff;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Signs out suspended staff mid-session and tracks "last active".
 */
class EnsureStaffIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Staff|null $staff */
        $staff = Auth::guard('admin')->user();

        if ($staff && ! $staff->isActive()) {
            Auth::guard('admin')->logout();

            return response()->json(['message' => 'account_suspended'], 403);
        }

        if ($staff && (! $staff->last_active_at || $staff->last_active_at->lt(now()->subMinutes(5)))) {
            $staff->forceFill(['last_active_at' => now()])->saveQuietly();
        }

        return $next($request);
    }
}
