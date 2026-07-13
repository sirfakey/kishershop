<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class AdminCredentials extends Command
{
    protected $signature = 'admin:credentials
                            {email? : The new admin email}
                            {password? : The new admin password}';

    protected $description = 'Create or update the admin account with secure credentials';

    public function handle(): int
    {
        $email    = $this->argument('email');
        $password = $this->argument('password');

        // ── Interactive mode when no arguments are passed ──────────
        if (! $email) {
            $email = $this->ask('Admin email');
        }
        if (! $password) {
            $password = $this->secret('Admin password (min 8 chars)');
            $confirm  = $this->secret('Confirm password');

            if ($password !== $confirm) {
                $this->error('Passwords do not match.');
                return self::FAILURE;
            }
        }

        // ── Validate ───────────────────────────────────────────────
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Invalid email address.');
            return self::FAILURE;
        }

        if (strlen($password) < 8) {
            $this->error('Password must be at least 8 characters.');
            return self::FAILURE;
        }

        // ── Strength warning ───────────────────────────────────────
        $hasUpper   = (bool) preg_match('/[A-Z]/', $password);
        $hasLower   = (bool) preg_match('/[a-z]/', $password);
        $hasDigit   = (bool) preg_match('/[0-9]/', $password);
        $hasSpecial = (bool) preg_match('/[^A-Za-z0-9]/', $password);
        $score      = (int) $hasUpper + (int) $hasLower + (int) $hasDigit + (int) $hasSpecial;

        if ($score < 3) {
            $this->warn('⚠  Password is weak. Use a mix of uppercase, lowercase, digits, and symbols.');
            if (! $this->confirm('Use this password anyway?')) {
                return self::FAILURE;
            }
        }

        // ── Upsert the admin user (id=1 if exists, else create) ────
        $admin = User::updateOrCreate(
            ['email' => $email],
            [
                'name'              => 'Store Admin',
                'password'          => $password,  // casted to hashed by model
                'email_verified_at' => now(),
            ]
        );

        $this->info('✅ Admin account ready.');
        $this->table(
            ['ID', 'Name', 'Email'],
            [[$admin->id, $admin->name, $admin->email]],
        );

        $this->newLine();
        $this->line('Login at: <comment>' . config('app.url') . '/admin</comment>');

        return self::SUCCESS;
    }
}
