<?php

namespace App\Http\Resources;

use App\Models\ActivityLog;
use Illuminate\Http\Request;

/**
 * @mixin ActivityLog
 */
class ActivityLogResource extends ApiResource
{
    protected array $optional = ['meta'];

    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'actor' => $this->actor,
            'action' => $this->action,
            'subject' => $this->subject,
            'meta' => $this->meta,
            'ip' => (string) $this->ip,
            'createdAt' => self::iso($this->created_at),
        ];
    }
}
