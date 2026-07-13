<?php

use App\Http\Controllers\Auth\AdminAuthController;
use App\Http\Controllers\Auth\CustomerAuthController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\ProductGroupController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\TradeController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\ImageUploadController;
use App\Http\Controllers\CouponController;
use Illuminate\Support\Facades\Route;

// ─── Public Storefront Routes ────────────────────────────────────────
Route::get('/categories', [ProductGroupController::class, 'index']);
Route::get('/categories/{slug}', [ProductGroupController::class, 'show']);
Route::post('/checkout', [ProductGroupController::class, 'checkout']);
Route::get('/settings', [SettingController::class, 'index']);
Route::get('/notifications', [AnnouncementController::class, 'active']);
Route::post('/trades', [TradeController::class, 'store']);

// ─── Coupon Validation (public) ───────────────────────────────────────
Route::post('/coupon/validate', [CouponController::class, 'validateCoupon']);

// ─── Customer Auth Routes (public) ──────────────────────────────────
Route::post('/register', [CustomerAuthController::class, 'register']);
Route::post('/login', [CustomerAuthController::class, 'login']);
Route::post('/verify-email', [CustomerAuthController::class, 'verifyEmail']);
// ─── Protected Customer Routes ──────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [CustomerAuthController::class, 'me']);
    Route::get('/user/transactions', [CustomerAuthController::class, 'purchaseHistory']);
    Route::post('/logout', [CustomerAuthController::class, 'logout']);
});

// ─── Admin Auth Routes (public) ─────────────────────────────────────
Route::post('/admin/login', [AdminAuthController::class, 'login']);

// ─── Protected Admin Routes ─────────────────────────────────────────
Route::middleware('auth:sanctum')->prefix('admin')->group(function () {
    Route::post('/logout', [AdminAuthController::class, 'logout']);
    Route::put('/settings', [SettingController::class, 'update']);
    Route::get('/stats', [AdminController::class, 'getStats']);
    Route::get('/transactions', [AdminController::class, 'getTransactions']);
    Route::get('/transactions/export', [AdminController::class, 'exportTransactionsCsv']);
    Route::patch('/transactions/{id}/fulfill', [AdminController::class, 'fulfillTransaction']);
    Route::put('/transactions/{id}/status', [AdminController::class, 'updateTransactionStatus']);
    Route::delete('/transactions/{id}', [AdminController::class, 'deleteTransaction']);
    Route::get('/products', [AdminController::class, 'listProducts']);
    Route::post('/products', [AdminController::class, 'storeProduct']);
    Route::put('/products/{id}', [AdminController::class, 'updateProduct']);
    Route::delete('/products/{id}', [AdminController::class, 'deleteProduct']);
    Route::get('/product-groups', [AdminController::class, 'listProductGroups']);
    Route::post('/product-groups', [AdminController::class, 'storeProductGroup']);
    Route::put('/product-groups/{id}', [AdminController::class, 'updateProductGroup']);
    Route::delete('/product-groups/{id}', [AdminController::class, 'deleteProductGroup']);
    Route::get('/trades', [AdminController::class, 'listTrades']);
    Route::patch('/trades/{id}/status', [AdminController::class, 'updateTradeStatus']);
    Route::get('/announcements', [AdminController::class, 'listAnnouncements']);
    Route::post('/announcements', [AdminController::class, 'storeAnnouncement']);
    Route::put('/announcements/{id}', [AdminController::class, 'updateAnnouncement']);
    Route::delete('/announcements/{id}', [AdminController::class, 'deleteAnnouncement']);
    Route::post('/upload', [ImageUploadController::class, 'upload']);

    // ─── Coupon Management ───────────────────────────────────────────
    Route::get('/coupons', [CouponController::class, 'index']);
    Route::get('/coupons/export', [CouponController::class, 'export']);
    Route::post('/coupons', [CouponController::class, 'store']);
    Route::put('/coupons/{id}', [CouponController::class, 'update']);
    Route::delete('/coupons/{id}', [CouponController::class, 'destroy']);
});