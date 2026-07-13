<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use Illuminate\Support\Facades\Log;

class AnnouncementController extends Controller
{
    /**
     * Return all active announcements (public, no auth required).
     */
    public function active()
    {
        try {
            $announcements = Announcement::active()
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($announcements, 200);
        } catch (\Exception $e) {
            Log::error('Announcement active error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load announcements.',
            ], 500);
        }
    }
}
