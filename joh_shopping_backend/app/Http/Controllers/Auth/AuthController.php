<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Notifications\TwoFactorCode;
use App\Rules\TanzanianPhone;
use App\Support\Phone;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

/**
 * Customer authentication (web guard, Sanctum SPA cookie session).
 * The SPA calls GET /sanctum/csrf-cookie first, then these endpoints.
 */
class AuthController extends Controller
{
    private const TWO_FACTOR_TTL_MINUTES = 10;

    /**
     * Sign in with email or phone. Customers with two-step verification on get
     * an emailed code and must finish at POST /api/two-factor-challenge.
     */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'identifier' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        $user = $this->findByIdentifier($data['identifier']);

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['identifier' => 'invalid_credentials'])->status(401);
        }
        if ($user->isBlocked()) {
            throw ValidationException::withMessages(['identifier' => 'account_blocked'])->status(403);
        }

        if ($user->two_factor) {
            $code = (string) random_int(100000, 999999);
            Cache::put($this->twoFactorKey($user), ['hash' => Hash::make($code), 'attempts' => 0], now()->addMinutes(self::TWO_FACTOR_TTL_MINUTES));
            $request->session()->put('two_factor', ['user' => $user->id, 'remember' => (bool) ($data['remember'] ?? false)]);
            $user->notify(new TwoFactorCode($code));

            return response()->json(['twoFactor' => true]);
        }

        Auth::guard('web')->login($user, (bool) ($data['remember'] ?? false));
        $request->session()->regenerate();

        return (new UserResource($user))->response();
    }

    public function twoFactorChallenge(Request $request): UserResource
    {
        $data = $request->validate(['code' => ['required', 'digits:6']]);
        $pending = $request->session()->get('two_factor');
        $user = $pending ? User::find($pending['user']) : null;
        $stored = $user ? Cache::get($this->twoFactorKey($user)) : null;

        if (! $user || ! $stored || $stored['attempts'] >= 5) {
            throw ValidationException::withMessages(['code' => 'code_expired']);
        }

        if (! Hash::check($data['code'], $stored['hash'])) {
            Cache::put($this->twoFactorKey($user), [...$stored, 'attempts' => $stored['attempts'] + 1], now()->addMinutes(self::TWO_FACTOR_TTL_MINUTES));
            throw ValidationException::withMessages(['code' => 'invalid_code']);
        }

        Cache::forget($this->twoFactorKey($user));
        $request->session()->forget('two_factor');
        Auth::guard('web')->login($user, $pending['remember']);
        $request->session()->regenerate();

        return new UserResource($user);
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'phone' => ['required', new TanzanianPhone],
            'password' => ['required', 'string', PasswordRule::defaults()],
            'language' => ['sometimes', Rule::in(['sw', 'en'])],
        ], ['email.unique' => 'email_taken']);

        $user = User::create([
            'name' => $data['name'],
            'email' => mb_strtolower($data['email']),
            'phone' => Phone::normalize($data['phone']),
            'password' => $data['password'],
            'status' => 'active',
            'region' => null,
            'preferences' => ['language' => $data['language'] ?? 'sw'],
        ]);

        event(new Registered($user));

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->regenerate(true);
        $request->session()->regenerateToken();

        return response()->json(null, 204);
    }

    /**
     * Always succeeds so the response does not reveal which emails exist.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);
        Password::broker('users')->sendResetLink(['email' => mb_strtolower($request->string('email')->toString())]);

        return response()->json(['ok' => true]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', PasswordRule::defaults()],
        ]);

        $status = Password::broker('users')->reset(
            [...$data, 'email' => mb_strtolower($data['email'])],
            function (User $user, string $password): void {
                $user->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();
                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['token' => 'invalid_token']);
        }

        return response()->json(['ok' => true]);
    }

    /**
     * Target of the signed link in the verification email (relayed by the SPA).
     */
    public function verifyEmail(Request $request, string $id, string $hash): JsonResponse
    {
        $user = User::findOrFail($id);

        if (! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            throw ValidationException::withMessages(['hash' => 'invalid_link']);
        }

        if (! $user->hasVerifiedEmail() && $user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return response()->json(['ok' => true]);
    }

    public function resendVerification(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        if (! $user->hasVerifiedEmail()) {
            $user->sendEmailVerificationNotification();
        }

        return response()->json(['ok' => true]);
    }

    private function findByIdentifier(string $identifier): ?User
    {
        $identifier = mb_strtolower(trim($identifier));

        if (str_contains($identifier, '@')) {
            return User::query()->where('email', $identifier)->first();
        }

        $phone = Phone::normalize($identifier);

        return $phone ? User::query()->where('phone', $phone)->first() : null;
    }

    private function twoFactorKey(User $user): string
    {
        return "two-factor:{$user->id}";
    }
}
