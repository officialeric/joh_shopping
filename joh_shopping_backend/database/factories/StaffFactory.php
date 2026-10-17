<?php

namespace Database\Factories;

use App\Models\Role;
use App\Models\Staff;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<Staff>
 */
class StaffFactory extends Factory
{
    protected static ?string $password;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => '+2557'.fake()->numberBetween(1, 8).fake()->numerify('#######'),
            'password' => static::$password ??= Hash::make('password'),
            'status' => 'active',
        ];
    }

    /**
     * Assign a role by id after creation (e.g. "role-super", "role-sales").
     */
    public function role(string $roleId): static
    {
        return $this->afterCreating(fn (Staff $staff) => $staff->syncRoles([Role::findOrFail($roleId)]));
    }

    public function suspended(): static
    {
        return $this->state(fn (array $attributes) => ['status' => 'suspended']);
    }
}
