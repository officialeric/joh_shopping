<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Http\Resources\AddressResource;
use App\Models\Address;
use App\Models\User;
use App\Rules\TanzanianPhone;
use App\Support\Phone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * Saved delivery addresses. Exactly one is the default.
 */
class AddressController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return AddressResource::collection($this->user($request)->addresses()->orderByDesc('is_default')->oldest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $data = $this->validated($request);

        $address = DB::transaction(function () use ($user, $data): Address {
            $isFirst = ! $user->addresses()->exists();
            $isDefault = ($data['isDefault'] ?? false) || $isFirst;
            if ($isDefault) {
                $user->addresses()->update(['is_default' => false]);
            }

            return $user->addresses()->create([...$this->columns($data), 'is_default' => $isDefault]);
        });

        return (new AddressResource($address))->response()->setStatusCode(201);
    }

    public function update(Request $request, string $address): AddressResource
    {
        $user = $this->user($request);
        $model = $user->addresses()->findOrFail($address);
        $data = $this->validated($request);

        DB::transaction(function () use ($user, $model, $data): void {
            if (! empty($data['isDefault'])) {
                $user->addresses()->whereKeyNot($model->id)->update(['is_default' => false]);
            }
            $model->update([...$this->columns($data), 'is_default' => $model->is_default || ! empty($data['isDefault'])]);
        });

        return new AddressResource($model);
    }

    public function destroy(Request $request, string $address): JsonResponse
    {
        $user = $this->user($request);
        $model = $user->addresses()->findOrFail($address);
        $model->delete();

        if ($model->is_default) {
            $user->addresses()->oldest()->first()?->update(['is_default' => true]);
        }

        return response()->json(null, 204);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'label' => ['required', 'string', 'max:60'],
            'fullName' => ['required', 'string', 'max:120'],
            'phone' => ['required', new TanzanianPhone],
            'region' => ['required', 'string', 'max:80'],
            'district' => ['required', 'string', 'max:80'],
            'street' => ['required', 'string', 'max:255'],
            'landmark' => ['nullable', 'string', 'max:255'],
            'isDefault' => ['sometimes', 'boolean'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function columns(array $data): array
    {
        return [
            'label' => $data['label'],
            'full_name' => $data['fullName'],
            'phone' => Phone::normalize($data['phone']),
            'region' => $data['region'],
            'district' => $data['district'],
            'street' => $data['street'],
            'landmark' => $data['landmark'] ?? null,
        ];
    }

    private function user(Request $request): User
    {
        return $request->user();
    }
}
