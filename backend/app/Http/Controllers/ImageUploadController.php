<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class ImageUploadController extends Controller
{
    /**
     * Upload one or more images to the public storage disk.
     * Returns an array of public URLs for each uploaded file.
     *
     * POST /api/admin/upload
     */
    public function upload(Request $request)
    {
        $request->validate([
            'images'   => 'required|array|min:1',
            'images.*' => 'required|file|mimes:jpeg,jpg,png,gif,webp|max:10240',
        ]);

        // Ensure the uploads directory exists with correct permissions (0755).
        // On Hostinger shared hosting, the directory may not exist yet, and
        // storage:link may be unavailable. This guarantees uploads never freeze.
        $disk = Storage::disk('public');
        $uploadDir = 'uploads';
        if (! $disk->exists($uploadDir)) {
            $disk->makeDirectory($uploadDir);
            // After creating, ensure permissions are web-readable
            $fullPath = $disk->path($uploadDir);
            if (is_dir($fullPath)) {
                @chmod($fullPath, 0755);
            }
        }

        $urls = [];

        foreach ($request->file('images') as $file) {
            // Sanitize filename: lowercase, alphanumeric + dashes + dots only
            $original = $file->getClientOriginalName();
            $ext      = strtolower($file->getClientOriginalExtension());
            $name     = pathinfo($original, PATHINFO_FILENAME);
            $safe     = Str::slug($name);
            $safe     = $safe ?: 'image';

            // Prepend a unique id to avoid collisions
            $filename = Str::uuid() . '-' . $safe . '.' . $ext;

            // Store directly into the Hostinger web-accessible directory
            // (public_html/storage/uploads/ ← configured as 'public' disk)
            $path = $file->storeAs('uploads', $filename, 'public');

            // Generate a fully qualified public URL using the production domain
            $urls[] = rtrim((string) config('app.url'), '/') . '/storage/' . $path;
        }

        return response()->json([
            'message' => count($urls) . ' image(s) uploaded successfully.',
            'urls'    => $urls,
        ], 201);
    }
}
