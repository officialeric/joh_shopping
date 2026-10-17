<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminUserResource;
use App\Models\Staff;
use App\Support\ActivityLogger;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

/**
 * Staff sign-in (admin guard, Sanctum SPA session), invitations and password reset.
 */
class AuthController extends Controller
{
    public function login(Request $request): AdminUserResource
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $staff = Staff::query()->where('email', mb_strtolower(trim($credentials['email'])))->first();

        if (! $staff || ! $staff->password || ! Auth::guard('admin')->attempt(['email' => $staff->email, 'password' => $credentials['password']], $request->boolean('remember'))) {
            throw ValidationException::withMessages(['email' => 'invalid_credentials'])->status(401);
        }

        if (! $staff->isActive()) {
            Auth::guard('admin')->logout();
            throw ValidationException::withMessages(['email' => $staff->status === 'invited' ? 'invite_pending' : 'account_suspended'])->status(403);
        }

        $request->session()->regenerate();
        $staff->forceFill(['last_active_at' => now()])->save();
        ActivityLogger::log('logged in', 'Admin panel', null, $staff);

        return new AdminUserResource($staff->load('roles'));
    }

    public function me(Request $request): AdminUserResource
    {
        /** @var Staff $staff */
        $staff = $request->user('admin');

        return new AdminUserResource($staff->load('roles'));
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('admin')->logout();
        $request->session()->regenerate(true);
        $request->session()->regenerateToken();

        return response()->json(null, 204);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);
        Password::broker('staff')->sendResetLink(['email' => mb_strtolower($request->string('email')->toString())]);

        return response()->json(['ok' => true]);
    }

    /**
     * Completes a password reset or an invitation (both use the staff broker).
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        $status = Password::broker('staff')->reset(
            [...$data, 'email' => mb_strtolower($data['email'])],
            function (Staff $staff, string $password): void {
                $staff->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                    'status' => $staff->status === 'invited' ? 'active' : $staff->status,
                ])->save();

                event(new PasswordReset($staff));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['token' => 'invalid_token']);
        }

        return response()->json(['ok' => true]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current' => ['required', 'string', 'current_password:admin'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ], ['current.current_password' => 'wrong_password']);

        /** @var Staff $staff */
        $staff = $request->user('admin');
        $staff->forceFill(['password' => $data['password']])->save();
        ActivityLogger::log('changed password', $staff->name);

        return response()->json(['ok' => true]);
    }
}
