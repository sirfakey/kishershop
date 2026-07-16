<?php

use App\Http\Controllers\ProductGroupController;
use App\Models\ProductGroup;
use Illuminate\Support\Facades\Route;

// ─── Dynamic sitemap.xml (MUST be declared before the SPA catch-all below) ───
// Served as application/xml; includes the homepage and every product category.
// The .htaccess routes /sitemap.xml to index.php so this runs instead of the
// static-file handler, keeping the sitemap fresh as categories are added.
Route::get('/sitemap.xml', function () {
    $groups = ProductGroup::orderBy('name')->get(['slug', 'updated_at']);
    $base = 'https://kisher.shop';
    $today = now()->format('Y-m-d');

    $lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <url>',
        '    <loc>' . $base . '/</loc>',
        '    <lastmod>' . $today . '</lastmod>',
        '    <changefreq>daily</changefreq>',
        '    <priority>1.0</priority>',
        '  </url>',
    ];

    foreach ($groups as $group) {
        $lastmod = $group->updated_at ? $group->updated_at->format('Y-m-d') : $today;
        $lines[] = '  <url>';
        $lines[] = '    <loc>' . $base . '/category/' . $group->slug . '</loc>';
        $lines[] = '    <lastmod>' . $lastmod . '</lastmod>';
        $lines[] = '    <changefreq>weekly</changefreq>';
        $lines[] = '    <priority>0.8</priority>';
        $lines[] = '  </url>';
    }

    $lines[] = '</urlset>';

    return response(implode("\n", $lines), 200, [
        'Content-Type' => 'application/xml; charset=UTF-8',
    ]);
})->name('sitemap');

// SPA catch-all: serve the React app for all non-API routes.
// Apache/nginx handles static files first (via .htaccess / config), so
// this route only fires when no real file exists — perfect for client-side routing.
Route::get('/{any}', function () {
    return file_get_contents(public_path('index.html'));
})->where('any', '^(?!api/|sanctum/).*$');

// Also catch the root path
Route::get('/', function () {
    return file_get_contents(public_path('index.html'));
});

Route::post('/checkout', [ProductGroupController::class, 'checkout']);
