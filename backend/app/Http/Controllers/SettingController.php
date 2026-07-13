<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Public endpoint: return the whitelisted site branding settings.
     * Route: GET /api/settings
     */
    public function index()
    {
        return response()->json(Setting::public(), 200);
    }

    /**
     * Authenticated admin endpoint: update site branding settings.
     * Route: PUT /api/admin/settings  (auth:sanctum)
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'site_name' => 'required|string|max:255',
            'logo_url'  => 'nullable|url|max:500',
        ]);

        Setting::set('site_name', $validated['site_name']);
        Setting::set('logo_url', $validated['logo_url'] ?? null);

        return response()->json([
            'message'  => 'Settings updated successfully.',
            'settings' => Setting::public(),
        ], 200);
    }
}
