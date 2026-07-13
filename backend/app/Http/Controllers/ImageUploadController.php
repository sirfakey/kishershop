<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

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
        try {
            $request->validate([
                'images'   => 'required|array|min:1',
                'images.*' => 'required|file|mimes:jpeg,jpg,png,gif,webp|max:10240',
            ]);

            $disk = Storage::disk('public');
            $uploadDir = 'uploads';
            if (! $disk->exists($uploadDir)) {
                $disk->makeDirectory($uploadDir);
                $fullPath = $disk->path($uploadDir);
                if (is_dir($fullPath)) {
                    @chmod($fullPath, 0755);
                }
            }

            $urls = [];

            foreach ($request->file('images') as $file) {
                $original = $file->getClientOriginalName();
                $ext      = strtolower($file->getClientOriginalExtension());
                $name     = pathinfo($original, PATHINFO_FILENAME);
                $safe     = Str::slug($name);
                $safe     = $safe ?: 'image';

                $filename = Str::uuid() . '-' . $safe . '.' . $ext;

                $path = $file->storeAs('uploads', $filename, 'public');

                $urls[] = rtrim((string) config('app.url'), '/') . '/storage/' . $path;
            }

            return response()->json([
                'message' => count($urls) . ' image(s) uploaded successfully.',
                'urls'    => $urls,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Image upload error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to upload image(s). Please try again.',
            ], 500);
        }
    }
}
