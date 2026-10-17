<?php

namespace App\Http\Controllers\Admin;

use App\Http\Resources\StaffResource;
use App\Models\Role;
use App\Models\Staff;
use App\Notifications\StaffInvitation;
use App\Rules\TanzanianPhone;
use App\Support\Permissions;
use App\Support\Phone;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

/**
 * Staff accounts. New staff without a password are emailed an invitation.
 * Guards: nobody can lock themselves out, and the last active Super Admin stays.
 *
 * @extends ResourceController<Staff>
 */
class StaffController extends ResourceController
{
    protected string $noun = 'staff member';

    protected function model(): string
    {
        return Staff::class;
    }

    protected function resource(): string
    {
        return StaffResource::class;
    }

    protected function label(Model $model): string
    {
        return "{$model->name} ({$model->email})";
    }

    protected function withRelations(Builder $query): Builder
    {
        return $query->with('roles');
    }

    protected function searchable(): array
    {
        return ['name', 'email', 'phone'];
    }

    protected function sortable(): array
    {
        return ['createdAt' => 'created_at', 'name' => 'name', 'lastActiveAt' => 'last_active_at', 'status' => 'status'];
    }

    protected function filterable(): array
    {
        return [
            'status' => 'status',
            'roleId' => fn (Builder $query, string $value) => $query->whereHas('roles', fn (Builder $roles) => $roles->whereKey($value)),
        ];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', Rule::unique('staff', 'email')->ignore($model?->getKey())],
            'phone' => ['nullable', new TanzanianPhone],
            'roleId' => ['required', 'string', Rule::exists('roles', 'id')->where('guard_name', 'admin')],
            'status' => ['required', Rule::in(['active', 'suspended', 'invited'])],
            'password' => ['nullable', PasswordRule::defaults()],
        ];
    }

    /**
     * @param  Staff  $model
     */
    protected function fill(Model $model, array $data): void
    {
        /** @var Staff $me */
        $me = Auth::guard('admin')->user();

        if ($model->exists && $model->is($me)) {
            if (isset($data['status']) && $data['status'] !== 'active') {
                throw ValidationException::withMessages(['status' => 'cannot_suspend_self']);
            }
            if (isset($data['roleId']) && $data['roleId'] !== $model->currentRole()?->id) {
                throw ValidationException::withMessages(['roleId' => 'cannot_change_own_role']);
            }
        }

        if (isset($data['phone'])) {
            $data['phone'] = Phone::normalize($data['phone']);
        }
        if (isset($data['email'])) {
            $data['email'] = mb_strtolower($data['email']);
        }

        parent::fill($model, Arr::except($data, ['roleId', 'password']));

        if (! empty($data['password'])) {
            $model->setAttribute('password', $data['password']);
        }
        if (! $model->exists && empty($data['password'])) {
            $model->setAttribute('status', 'invited');
        }
    }

    /**
     * @param  Staff  $model
     */
    protected function afterSave(Model $model, array $data, bool $created): void
    {
        if (isset($data['roleId'])) {
            $leavingSuperAdmin = $model->hasRole(Permissions::SUPER_ADMIN) && $data['roleId'] !== Permissions::SUPER_ADMIN_ID;
            if ($leavingSuperAdmin) {
                $this->ensureAnotherSuperAdmin($model);
            }
            $model->syncRoles([Role::findOrFail($data['roleId'])]);
        }

        if (isset($data['status']) && $data['status'] !== 'active' && $model->hasRole(Permissions::SUPER_ADMIN)) {
            $this->ensureAnotherSuperAdmin($model);
        }

        if ($created && $model->status === 'invited') {
            $token = Password::broker('staff')->createToken($model);
            $model->notify(new StaffInvitation($token));
        }
    }

    /**
     * Re-send the invitation email.
     */
    public function resendInvite(Staff $staff): StaffResource
    {
        if ($staff->status !== 'invited') {
            throw ValidationException::withMessages(['status' => 'not_invited']);
        }

        $staff->notify(new StaffInvitation(Password::broker('staff')->createToken($staff)));

        return new StaffResource($staff->load('roles'));
    }

    protected function ensureDeletable(Model $model): void
    {
        if ($model->is(Auth::guard('admin')->user())) {
            throw ValidationException::withMessages(['id' => 'cannot_delete_self']);
        }
        if ($model->hasRole(Permissions::SUPER_ADMIN)) {
            $this->ensureAnotherSuperAdmin($model);
        }
    }

    private function ensureAnotherSuperAdmin(Staff $staff): void
    {
        $others = Staff::role(Permissions::SUPER_ADMIN, 'admin')
            ->where('status', 'active')
            ->whereKeyNot($staff->getKey())
            ->exists();

        if (! $others) {
            throw ValidationException::withMessages(['roleId' => 'last_super_admin']);
        }
    }
}
