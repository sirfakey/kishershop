<?php

use App\Http\Controllers\ProductGroupController;
use Illuminate\Support\Facades\Route;

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
