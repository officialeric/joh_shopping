<?php

namespace App\Providers;

use App\Models\Staff;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Model::preventLazyLoading(! $this->app->isProduction());

        Relation::enforceMorphMap([
            'user' => User::class,
            'staff' => Staff::class,
        ]);

        Password::defaults(fn () => $this->app->isProduction()
            ? Password::min(8)->letters()->numbers()->uncompromised()
            : Password::min(8)->letters()->numbers());

        Gate::before(fn ($user) => $user instanceof Staff && $user->hasRole('Super Admin') ? true : null);

        $this->configureAuthLinks();
        $this->configureRateLimiting();
    }

    /**
     * Emails link to the Next.js app, which then calls the API.
     */
    private function configureAuthLinks(): void
    {
        $frontend = rtrim((string) config('app.frontend_url'), '/');

        ResetPassword::createUrlUsing(function (User|Staff $user, string $token) use ($frontend): string {
            $locale = $user instanceof User ? $user->preferredLocale() : 'sw';
            $path = $user instanceof Staff ? 'admin/reset-password' : 'reset-password';

            return "{$frontend}/{$locale}/{$path}?".http_build_query(['token' => $token, 'email' => $user->email]);
        });

        VerifyEmail::createUrlUsing(function (User $user) use ($frontend): string {
            $signed = URL::temporarySignedRoute('verification.verify', now()->addHours(24), [
                'id' => $user->getKey(),
                'hash' => sha1($user->getEmailForVerification()),
            ]);

            return "{$frontend}/{$user->preferredLocale()}/verify-email?".http_build_query(['verifyUrl' => $signed]);
        });
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(120)->by($request->user()?->getAuthIdentifier() ?: $request->ip()));

        RateLimiter::for('auth', fn (Request $request) => [
            Limit::perMinute(5)->by(mb_strtolower((string) ($request->input('identifier') ?? $request->input('email'))).'|'.$request->ip()),
            Limit::perMinute(20)->by($request->ip()),
        ]);

        RateLimiter::for('forms', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));

        RateLimiter::for('checkout', fn (Request $request) => Limit::perMinute(10)->by($request->user()?->getAuthIdentifier() ?: $request->ip()));
    }
}
