<?php

namespace App\Http\Controllers;

use App\Models\Announcement;

class AnnouncementController extends Controller
{
    /**
     * Return all active announcements (public, no auth required).
     */
    public function active()
    {
        $announcements = Announcement::active()
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($announcements, 200);
    }
}
