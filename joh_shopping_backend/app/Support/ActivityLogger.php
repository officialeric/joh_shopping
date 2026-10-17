<?php

namespace App\Support;

use App\Models\ActivityLog;
use App\Models\Staff;
use Illuminate\Support\Facades\Auth;

/**
 * Writes the back-office audit trail (Admin → Activity log).
 */
class ActivityLogger
{
    public static function log(string $action, string $subject, ?string $meta = null, ?Staff $actor = null): ActivityLog
    {
        /** @var Staff|null $staff */
        $staff = $actor ?? Auth::guard('admin')->user();

        return ActivityLog::create([
            'staff_id' => $staff?->id,
            'actor' => $staff->name ?? 'System',
            'action' => $action,
            'subject' => mb_substr($subject, 0, 250),
            'meta' => $meta,
            'ip' => request()->ip(),
        ]);
    }

    public static function actorName(): string
    {
        return Auth::guard('admin')->user()->name ?? 'System';
    }
}
