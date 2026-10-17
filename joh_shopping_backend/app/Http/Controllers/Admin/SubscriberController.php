<?php

namespace App\Http\Controllers\Admin;

use App\Http\Resources\SubscriberResource;
use App\Models\Subscriber;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @extends ResourceController<Subscriber>
 */
class SubscriberController extends ResourceController
{
    protected string $noun = 'subscriber';

    protected function model(): string
    {
        return Subscriber::class;
    }

    protected function resource(): string
    {
        return SubscriberResource::class;
    }

    protected function label(Model $model): string
    {
        return $model->email;
    }

    protected function searchable(): array
    {
        return ['email'];
    }

    protected function sortable(): array
    {
        return ['createdAt' => 'created_at', 'email' => 'email'];
    }

    protected function filterable(): array
    {
        return ['source' => 'source', 'active' => 'active'];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [
            'email' => ['required', 'email', 'max:255', Rule::unique('subscribers', 'email')->ignore($model?->getKey())],
            'source' => ['required', Rule::in(['footer', 'checkout', 'popup'])],
            'active' => ['required', 'boolean'],
        ];
    }

    protected function fill(Model $model, array $data): void
    {
        if (isset($data['email'])) {
            $data['email'] = mb_strtolower($data['email']);
        }
        parent::fill($model, $data);
    }
}
