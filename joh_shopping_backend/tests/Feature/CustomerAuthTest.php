<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\TwoFactorCode;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class CustomerAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_normalises_phone_signs_in_and_sends_verification(): void
    {
        Notification::fake();

        $this->fromSpa()->postJson('/api/register', [
            'name' => 'Baraka Temba',
            'email' => 'Baraka@Example.co.tz',
            'phone' => '0713 222 333',
            'password' => 'Secret123',
        ])->assertCreated()
            ->assertJsonPath('data.email', 'baraka@example.co.tz')
            ->assertJsonPath('data.phone', '+255713222333')
            ->assertJsonPath('data.emailVerified', false);

        $user = User::where('email', 'baraka@example.co.tz')->firstOrFail();
        $this->assertStringStartsWith('cus-', $user->id);
        $this->assertAuthenticatedAs($user, 'web');
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_duplicate_email_returns_the_email_taken_code(): void
    {
        User::factory()->create(['email' => 'amina@example.co.tz']);

        $this->postJson('/api/register', ['name' => 'A', 'email' => 'amina@example.co.tz', 'phone' => '0712345678', 'password' => 'Secret123'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'email_taken');
    }

    public function test_login_with_email_or_any_phone_format(): void
    {
        User::factory()->create(['email' => 'amina@example.co.tz', 'phone' => '+255712345678', 'password' => 'Password@123']);

        $this->fromSpa()->postJson('/api/login', ['identifier' => 'AMINA@example.co.tz', 'password' => 'Password@123'])->assertOk();
        $this->fromSpa()->postJson('/api/logout')->assertNoContent();
        $this->fromSpa()->postJson('/api/login', ['identifier' => '0712 345 678', 'password' => 'Password@123'])->assertOk()->assertJsonPath('data.email', 'amina@example.co.tz');
        $this->fromSpa()->postJson('/api/login', ['identifier' => '255712345678', 'password' => 'wrong'])->assertStatus(401)->assertJsonPath('message', 'invalid_credentials');
    }

    public function test_blocked_customers_cannot_sign_in_or_use_their_session(): void
    {
        $user = User::factory()->blocked()->create(['password' => 'Password@123']);

        $this->fromSpa()->postJson('/api/login', ['identifier' => $user->email, 'password' => 'Password@123'])->assertForbidden();
        $this->actingAs($user)->getJson('/api/user')->assertForbidden()->assertJsonPath('message', 'account_blocked');
    }

    public function test_two_factor_login_requires_the_emailed_code(): void
    {
        Notification::fake();
        $user = User::factory()->withTwoFactor()->create(['password' => 'Password@123']);

        $this->fromSpa()->postJson('/api/login', ['identifier' => $user->email, 'password' => 'Password@123'])
            ->assertOk()
            ->assertExactJson(['twoFactor' => true]);
        $this->assertGuest('web');

        $code = null;
        Notification::assertSentTo($user, TwoFactorCode::class, function (TwoFactorCode $notification) use (&$code): bool {
            $code = $notification->code;

            return true;
        });

        $this->fromSpa()->postJson('/api/two-factor-challenge', ['code' => $code === '000000' ? '111111' : '000000'])->assertJsonPath('errors.code.0', 'invalid_code');
        $this->fromSpa()->postJson('/api/two-factor-challenge', ['code' => $code])->assertOk()->assertJsonPath('data.id', $user->id);
        $this->assertAuthenticatedAs($user, 'web');
    }

    public function test_change_password_checks_the_current_one(): void
    {
        $user = User::factory()->create(['password' => 'Password@123']);

        $this->actingAs($user)->putJson('/api/user/password', ['current' => 'nope', 'password' => 'NewPass123'])
            ->assertJsonPath('errors.current.0', 'wrong_password');
        $this->actingAs($user)->putJson('/api/user/password', ['current' => 'Password@123', 'password' => 'NewPass123'])->assertOk();
    }

    public function test_preferences_round_trip_with_defaults(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/user/preferences')->assertJsonPath('data.language', 'sw')->assertJsonPath('data.preferredPayment', 'mpesa');
        $this->actingAs($user)->putJson('/api/user/preferences', ['language' => 'en', 'newsletter' => true])->assertJsonPath('data.language', 'en');

        $this->assertTrue($user->fresh()->newsletter);
        $this->assertSame('en', $user->fresh()->preferredLocale());
    }

    public function test_addresses_keep_exactly_one_default(): void
    {
        $user = User::factory()->create();
        $address = ['label' => 'Nyumbani', 'fullName' => 'A', 'phone' => '0712345678', 'region' => 'Dar es Salaam', 'district' => 'Ilala', 'street' => 'X'];

        $first = $this->actingAs($user)->postJson('/api/addresses', $address)->assertCreated()->assertJsonPath('data.isDefault', true)->json('data.id');
        $second = $this->actingAs($user)->postJson('/api/addresses', [...$address, 'label' => 'Ofisini', 'isDefault' => true])->json('data.id');

        $this->assertFalse($user->addresses()->find($first)->is_default);
        $this->actingAs($user)->deleteJson("/api/addresses/{$second}")->assertNoContent();
        $this->assertTrue($user->addresses()->find($first)->is_default);
    }

    public function test_deleting_the_account_requires_the_password(): void
    {
        $user = User::factory()->create(['password' => 'Password@123']);

        $this->fromSpa()->actingAs($user)->deleteJson('/api/user', ['password' => 'wrong'])->assertUnprocessable();
        $this->fromSpa()->actingAs($user)->deleteJson('/api/user', ['password' => 'Password@123'])->assertNoContent();
        $this->assertModelMissing($user);
    }
}
