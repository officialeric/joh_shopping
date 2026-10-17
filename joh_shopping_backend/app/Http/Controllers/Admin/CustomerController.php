<?php

namespace App\Http\Controllers\Admin;

use App\Http\Resources\CustomerResource;
use App\Models\User;
use App\Rules\TanzanianPhone;
use App\Support\Phone;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Customers as seen by the back office (the `users` table).
 *
 * @extends ResourceController<User>
 */
class CustomerController extends ResourceController
{
    protected string $noun = 'customer';

    protected function model(): string
    {
        return User::class;
    }

    protected function resource(): string
    {
        return CustomerResource::class;
    }

    protected function label(Model $model): string
    {
        return "{$model->name} ({$model->email})";
    }

    protected function searchable(): array
    {
        return ['name', 'email', 'phone'];
    }

    protected function sortable(): array
    {
        return [
            'createdAt' => 'created_at',
            'name' => 'name',
            'ordersCount' => 'orders_count',
            'totalSpent' => 'total_spent',
            'lastOrderAt' => 'last_order_at',
            'region' => 'region',
            'email' => 'email',
        ];
    }

    protected function filterable(): array
    {
        return ['status' => 'status', 'region' => 'region', 'newsletter' => 'newsletter'];
    }

    /**
     * The detail view also lists the customer's saved addresses.
     */
    public function show(string $id): CustomerResource
    {
        return new CustomerResource(User::query()->with('addresses')->findOrFail($id));
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($model?->getKey())],
            'phone' => ['required', new TanzanianPhone],
            'status' => ['required', Rule::in(['active', 'blocked'])],
            'region' => ['nullable', 'string', 'max:80'],
            'newsletter' => ['sometimes', 'boolean'],
        ];
    }

    protected function fill(Model $model, array $data): void
    {
        if (isset($data['phone'])) {
            $data['phone'] = Phone::normalize($data['phone']);
        }
        if (isset($data['email'])) {
            $data['email'] = mb_strtolower($data['email']);
        }
        parent::fill($model, $data);

        if (! $model->exists) {
            $model->setAttribute('password', Str::password(24));
        }
    }

    /**
     * New customers created by staff get a link to set their own password.
     *
     * @param  User  $model
     */
    protected function afterSave(Model $model, array $data, bool $created): void
    {
        if ($created) {
            Password::broker('users')->sendResetLink(['email' => $model->email]);
        }
    }
}
