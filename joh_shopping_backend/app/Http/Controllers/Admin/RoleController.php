<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\LocalizedRules;
use App\Http\Resources\RoleResource;
use App\Models\Role;
use App\Support\Permissions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Roles & permissions (Spatie, admin guard). System roles keep their name and
 * cannot be deleted; Super Admin always keeps every permission.
 *
 * @extends ResourceController<Role>
 */
class RoleController extends ResourceController
{
    use LocalizedRules;

    protected string $noun = 'role';

    protected string $defaultSort = 'createdAt';

    protected function model(): string
    {
        return Role::class;
    }

    protected function resource(): string
    {
        return RoleResource::class;
    }

    protected function label(Model $model): string
    {
        return $model->name;
    }

    protected function query(): Builder
    {
        return Role::query()->where('guard_name', 'admin');
    }

    protected function withRelations(Builder $query): Builder
    {
        return $query->with('permissions');
    }

    protected function searchable(): array
    {
        return ['name'];
    }

    protected function sortable(): array
    {
        return ['createdAt' => 'created_at', 'name' => 'name'];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [
            'name' => [
                'required', 'string', 'max:60',
                Rule::unique('roles', 'name')->where('guard_name', 'admin')->ignore($model?->getKey()),
                Rule::when((bool) $model?->system, [Rule::in([$model?->name])]),
            ],
            ...self::localized('description', false, 255),
            'permissions' => ['required', 'array'],
            'permissions.*' => [Rule::in(Permissions::ALL)],
        ];
    }

    protected function fill(Model $model, array $data): void
    {
        parent::fill($model, Arr::except($data, ['permissions']));
        $model->setAttribute('guard_name', 'admin');
        if (! $model->exists) {
            $model->setAttribute('system', false);
        }
    }

    /**
     * @param  Role  $model
     */
    protected function afterSave(Model $model, array $data, bool $created): void
    {
        if (array_key_exists('permissions', $data)) {
            $model->syncPermissions($model->name === Permissions::SUPER_ADMIN ? Permissions::ALL : $data['permissions']);
        }
    }

    protected function ensureDeletable(Model $model): void
    {
        if ($model->system) {
            throw ValidationException::withMessages(['id' => 'system_role']);
        }
        if (DB::table('model_has_roles')->where('role_id', $model->getKey())->exists()) {
            throw ValidationException::withMessages(['id' => 'role_in_use']);
        }
    }
}
