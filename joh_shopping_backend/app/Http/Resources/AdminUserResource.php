<?php

namespace App\Http\Resources;

use App\Models\Staff;
use Illuminate\Http\Request;

/**
 * The signed-in staff member with their effective permissions.
 *
 * @mixin Staff
 */
class AdminUserResource extends ApiResource
{
    protected function fields(Request $request): array
    {
        $role = $this->currentRole();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'roleId' => (string) $role?->id,
            'roleName' => (string) $role?->name,
            'permissions' => $this->getAllPermissions()->pluck('name')->values(),
        ];
    }
}
