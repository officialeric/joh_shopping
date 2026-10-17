<?php

namespace App\Http\Resources;

use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * @mixin Role
 */
class RoleResource extends ApiResource
{
    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description ?? ['sw' => '', 'en' => ''],
            'permissions' => $this->permissions->pluck('name')->values(),
            'system' => $this->system,
            'staffCount' => DB::table('model_has_roles')->where('role_id', $this->id)->count(),
        ];
    }
}
