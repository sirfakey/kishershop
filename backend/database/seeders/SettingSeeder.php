<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    /**
     * Seed the default site branding settings.
     */
    public function run(): void
    {
        Setting::set('site_name', 'KisherShop');
        // Empty logo_url makes the frontend render a styled text-mark fallback.
        Setting::set('logo_url', null);
    }
}
