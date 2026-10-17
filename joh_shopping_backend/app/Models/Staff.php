<?php

namespace App\Models;

use App\Models\Concerns\HasPrefixedId;
use Database\Factories\StaffFactory;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Unguarded;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

/**
 * A back-office staff member (admin guard). Holds exactly one role.
 */
#[Unguarded]
#[Hidden(['password', 'remember_token'])]
class Staff extends Authenticatable
{
    /** @use HasFactory<StaffFactory> */
    use HasFactory, HasPrefixedId, HasRoles, Notifiable;

    protected $table = 'staff';

    protected string $guard_name = 'admin';

    public static function idPrefix(): string
    {
        return 'stf';
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'last_active_at' => 'datetime',
        ];
    }

    public function currentRole(): ?Role
    {
        /** @var Role|null */
        return $this->roles->first();
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
