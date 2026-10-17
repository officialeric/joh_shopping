<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Order;
use App\Models\User;
use App\Rules\TanzanianPhone;
use App\Support\Phone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;

/**
 * The signed-in customer's profile, password, preferences and account deletion.
 */
class ProfileController extends Controller
{
    public function show(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    public function update(Request $request): UserResource
    {
        /** @var User $user */
        $user = $request->user();
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['sometimes', 'required', new TanzanianPhone],
            'twoFactor' => ['sometimes', 'boolean'],
        ], ['email.unique' => 'email_taken']);

        $emailChanged = isset($data['email']) && mb_strtolower($data['email']) !== $user->email;

        $user->fill(array_filter([
            'name' => $data['name'] ?? null,
            'email' => isset($data['email']) ? mb_strtolower($data['email']) : null,
            'phone' => isset($data['phone']) ? Phone::normalize($data['phone']) : null,
        ], fn (?string $value): bool => $value !== null));

        if (array_key_exists('twoFactor', $data)) {
            $user->two_factor = $data['twoFactor'];
        }
        if ($emailChanged) {
            $user->email_verified_at = null;
        }
        $user->save();

        if ($emailChanged) {
            $user->sendEmailVerificationNotification();
        }

        return new UserResource($user);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current' => ['required', 'string', 'current_password:web'],
            'password' => ['required', 'string', PasswordRule::defaults()],
        ], ['current.current_password' => 'wrong_password']);

        $request->user()->forceFill(['password' => $data['password']])->save();

        return response()->json(['ok' => true]);
    }

    public function preferences(Request $request): JsonResponse
    {
        return response()->json(['data' => $request->user()->resolvedPreferences()]);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $data = $request->validate([
            'language' => ['sometimes', Rule::in(['sw', 'en'])],
            'notifyEmail' => ['sometimes', 'boolean'],
            'notifySms' => ['sometimes', 'boolean'],
            'notifyWhatsapp' => ['sometimes', 'boolean'],
            'orderUpdates' => ['sometimes', 'boolean'],
            'promotions' => ['sometimes', 'boolean'],
            'priceDrops' => ['sometimes', 'boolean'],
            'newsletter' => ['sometimes', 'boolean'],
            'preferredPayment' => ['sometimes', Rule::in(Order::PAYMENT_METHODS)],
            'preferredDelivery' => ['sometimes', Rule::in(Order::DELIVERY_METHODS)],
        ]);

        /** @var User $user */
        $user = $request->user();
        $preferences = [...$user->resolvedPreferences(), ...$data];
        $user->forceFill([
            'preferences' => $preferences,
            'newsletter' => (bool) $preferences['newsletter'],
        ])->save();

        return response()->json(['data' => $preferences]);
    }

    /**
     * Delete the account. Orders are kept (with their snapshots) for accounting.
     */
    public function destroy(Request $request): JsonResponse
    {
        $request->validate(['password' => ['required', 'string', 'current_password:web']], ['password.current_password' => 'wrong_password']);

        $user = $request->user();
        Auth::guard('web')->logout();
        $user->tokens()->delete();
        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(null, 204);
    }
}
