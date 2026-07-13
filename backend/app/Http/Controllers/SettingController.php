<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SettingController extends Controller
{
    /**
     * Public endpoint: return the whitelisted site branding settings.
     * Route: GET /api/settings
     */
    public function index()
    {
        try {
            return response()->json(Setting::public(), 200);
        } catch (\Exception $e) {
            Log::error('Settings index error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load site settings.',
            ], 500);
        }
    }

    /**
     * Authenticated admin endpoint: update site branding settings.
     * Route: PUT /api/admin/settings  (auth:sanctum)
     */
    public function update(Request $request)
    {
        try {
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
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Settings update error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update settings.',
            ], 500);
        }
    }
}
