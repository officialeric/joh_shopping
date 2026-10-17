<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rejects requests from customers who are not customers (e.g. staff tokens) or are blocked.
 */
class EnsureCustomerIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof User) {
            return response()->json(['message' => 'unauthenticated'], 401);
        }

        if ($user->isBlocked()) {
            return response()->json(['message' => 'account_blocked'], 403);
        }

        return $next($request);
    }
}
