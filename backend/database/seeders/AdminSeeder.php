<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Seed the default admin user.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@kishershop.com')],
            [
                'name'     => 'Store Admin',
                'password' => Hash::make(env('ADMIN_PASSWORD', 'admin123')),
            ]
        );
    }
}