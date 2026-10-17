<?php

namespace App\Http\Resources;

use App\Models\Staff;
use Illuminate\Http\Request;

/**
 * @mixin Staff
 */
class StaffResource extends ApiResource
{
    protected array $optional = ['lastActiveAt'];

    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => (string) $this->phone,
            'roleId' => (string) $this->currentRole()?->id,
            'status' => $this->status,
            'lastActiveAt' => self::iso($this->last_active_at),
            'createdAt' => self::iso($this->created_at),
        ];
    }
}
