<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;

/**
 * The signed-in customer.
 *
 * @mixin User
 */
class UserResource extends ApiResource
{
    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => (string) $this->phone,
            'emailVerified' => $this->email_verified_at !== null,
            'twoFactor' => $this->two_factor,
            'createdAt' => self::iso($this->created_at),
        ];
    }
}
