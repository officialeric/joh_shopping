<?php

namespace App\Console\Commands;

use App\Models\Role;
use App\Models\Staff;
use App\Support\Permissions;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

#[Signature('app:create-admin {--name=} {--email=}')]
#[Description('Create (or reset) a Super Admin staff account')]
class CreateAdmin extends Command
{
    public function handle(): int
    {
        $this->callSilently('db:seed', ['--class' => RolesAndPermissionsSeeder::class, '--force' => true]);

        $name = $this->option('name') ?: $this->ask('Name');
        $email = mb_strtolower((string) ($this->option('email') ?: $this->ask('Email')));
        $password = $this->secret('Password (min 8 characters, letters and numbers)');

        $validator = Validator::make(
            ['name' => $name, 'email' => $email, 'password' => $password],
            ['name' => ['required', 'string'], 'email' => ['required', 'email'], 'password' => ['required', Password::defaults()]],
        );
        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $staff = Staff::query()->updateOrCreate(['email' => $email], [
            'name' => $name,
            'password' => $password,
            'status' => 'active',
        ]);
        $staff->syncRoles([Role::findOrFail(Permissions::SUPER_ADMIN_ID)]);

        $this->info("Super Admin ready: {$staff->email}");

        return self::SUCCESS;
    }
}
