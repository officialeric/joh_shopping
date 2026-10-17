<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'slug' => Str::slug($name),
            'name' => ['sw' => $name, 'en' => $name],
            'description' => ['sw' => '', 'en' => ''],
            'parent_id' => null,
            'icon' => 'smartphone',
            'art' => 'phone',
            'active' => true,
            'sort_order' => 0,
        ];
    }
}
