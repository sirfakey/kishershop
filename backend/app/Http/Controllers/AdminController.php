<?php

namespace App\Http\Controllers;

use App\Models\ProductGroup;
use App\Models\Transaction;
use App\Models\Product;
use App\Models\Trade;
use App\Models\Announcement;
use App\Models\User;
use App\Mail\TradeStatusNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminController extends Controller
{
    // 1. Fetch High-Level Store Statistics
    public function getStats()
    {
        try {
            $totalSalesCount = Transaction::where('status', 'completed')->count();
            $totalRevenue = Transaction::where('status', 'completed')->sum('price');
            $unfulfilledCount = Transaction::where('status', 'pending')->count();

            return response()->json([
                'total_sales'       => $totalSalesCount,
                'total_revenue'     => (float) $totalRevenue,
                'unfulfilled_orders' => $unfulfilledCount,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Admin stats error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load store statistics.',
            ], 500);
        }
    }

    // 2. List All Orders/Transactions (with product eager-loaded for SKU)
    public function getTransactions()
    {
        try {
            $transactions = Transaction::with('product.productGroup')
                ->orderBy('created_at', 'desc')
                ->get();
            return response()->json($transactions, 200);
        } catch (\Exception $e) {
            Log::error('Admin transactions error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load transactions.',
            ], 500);
        }
    }

    // 3. Toggle Order State to Completed (legacy; use updateTransactionStatus for full control)
    public function fulfillTransaction($id)
    {
        try {
            $transaction = Transaction::findOrFail($id);

            $oldStatus = $transaction->status;
            $transaction->status = 'completed';
            $transaction->save();

            // Grant earned points only if transitioning from non-completed to completed
            $userId = $transaction->user_id;
            $pointsEarned = (int) $transaction->points_earned;
            if ($oldStatus !== 'completed' && $userId && $pointsEarned > 0) {
                \App\Models\User::where('id', $userId)->increment('points', $pointsEarned);
            }

            return response()->json([
                'message'     => 'Order marked as completed successfully!',
                'transaction' => $transaction
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Transaction not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Fulfill transaction error: ' . $e->getMessage(), ['id' => $id]);
            return response()->json([
                'message' => 'Failed to fulfill transaction.',
            ], 500);
        }
    }

    // 3b. Update order status to any valid value
    public function updateTransactionStatus(Request $request, $id)
    {
        try {
            $transaction = Transaction::findOrFail($id);

            $validated = $request->validate([
                'status' => 'required|in:pending,completed,refunded',
            ]);

            $oldStatus = $transaction->status;
            $newStatus = $validated['status'];
            $transaction->status = $newStatus;
            $transaction->save();

            // Handle points based on status transition
            $userId = $transaction->user_id;
            $pointsEarned = (int) $transaction->points_earned;
            $pointsRedeemed = (int) $transaction->points_redeemed;

            if ($oldStatus !== 'completed' && $newStatus === 'completed') {
                // Order just fulfilled — grant earned points
                if ($userId && $pointsEarned > 0) {
                    \App\Models\User::where('id', $userId)->increment('points', $pointsEarned);
                }
            } elseif ($oldStatus === 'completed' && $newStatus !== 'completed') {
                // Order un-fulfilled (refunded or back to pending) — reverse points
                if ($userId) {
                    if ($pointsEarned > 0) {
                        \App\Models\User::where('id', $userId)->decrement('points', $pointsEarned);
                    }
                    if ($pointsRedeemed > 0) {
                        \App\Models\User::where('id', $userId)->increment('points', $pointsRedeemed);
                    }
                }
            }

            return response()->json([
                'message'     => 'Order status updated successfully!',
                'transaction' => $transaction->load('product.productGroup'),
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Transaction not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Update transaction status error: ' . $e->getMessage(), ['id' => $id]);
            return response()->json([
                'message' => 'Failed to update transaction status.',
            ], 500);
        }
    }

    // 4. Create a New Digital Product
    public function storeProduct(Request $request)
    {
        try {
            $validated = $request->validate([
                'name'                => 'required|string|max:255',
                'description'         => 'nullable|string',
                'price'               => 'required|numeric|min:0',
                'original_price'      => 'nullable|numeric|min:0',
                'discount_percentage' => 'nullable|integer|min:1|max:99',
                'product_group_id'    => 'required|exists:product_groups,id',
                'type'                => 'required|string',
                'custom_form_code'    => 'nullable|string',
                'sku'                 => 'nullable|string|unique:products,sku',
                'image_url'           => 'nullable|string|max:2048',
            ]);

            // Section 2: original_price must be > price when provided
            if (!empty($validated['original_price']) && $validated['original_price'] <= $validated['price']) {
                return response()->json([
                    'message' => 'The original price must be greater than the active sale price.',
                    'errors'  => ['original_price' => ['Original price must be greater than the current sale price.']],
                ], 422);
            }

            $product = Product::create($validated);

            return response()->json([
                'message' => 'Product created successfully!',
                'product' => $product
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Store product error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to create product.',
            ], 500);
        }
    }

    // 5. Native CSV Export Spreadsheet Stream
    public function exportTransactionsCsv(): StreamedResponse
    {
        try {
            $fileName = 'kisher-shop_sales_' . date('Y-m-d') . '.csv';
            $transactions = Transaction::orderBy('created_at', 'desc')->get();

            $headers = [
                "Content-type"        => "text/csv",
                "Content-Disposition" => "attachment; filename=$fileName",
                "Pragma"              => "no-cache",
                "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
                "Expires"             => "0"
            ];

            $callback = function () use ($transactions) {
                $file = fopen('php://output', 'w');

                fputcsv($file, ['ID', 'Transaction ID', 'Price', 'Status', 'Date Created']);

                foreach ($transactions as $row) {
                    fputcsv($file, [
                        $row->id,
                        $row->transaction_id,
                        $row->price,
                        $row->status,
                        $row->created_at,
                    ]);
                }

                fclose($file);
            };

            return response()->stream($callback, 200, $headers);
        } catch (\Exception $e) {
            Log::error('Export CSV error: ' . $e->getMessage());
            // For stream responses we can't return JSON mid-stream,
            // so we return a fallback StreamedResponse with the error
            return response()->stream(function () use ($e) {
                $file = fopen('php://output', 'w');
                fputcsv($file, ['Error', $e->getMessage()]);
                fclose($file);
            }, 500, [
                "Content-type"        => "text/csv",
                "Content-Disposition" => "attachment; filename=error.csv",
            ]);
        }
    }

    // 6. List All Products (with their group)
    public function listProducts()
    {
        try {
            $products = Product::with(['productGroup'])->orderBy('created_at', 'desc')->get();
            return response()->json($products, 200);
        } catch (\Exception $e) {
            Log::error('List products error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load products.',
            ], 500);
        }
    }

    // 7. Update a Product
    public function updateProduct(Request $request, $id)
    {
        try {
            $product = Product::findOrFail($id);

            $validated = $request->validate([
                'name'                => 'sometimes|required|string|max:255',
                'description'         => 'nullable|string',
                'price'               => 'sometimes|required|numeric|min:0',
                'original_price'      => 'nullable|numeric|min:0',
                'discount_percentage' => 'nullable|integer|min:1|max:99',
                'product_group_id'    => 'sometimes|required|exists:product_groups,id',
                'type'                => 'sometimes|required|string',
                'custom_form_code'    => 'nullable|string',
                'sku'                 => 'nullable|string|unique:products,sku,' . $id,
                'image_url'           => 'nullable|string|max:2048',
            ]);

            // Section 2: original_price must be > price when provided
            $checkPrice = $validated['price'] ?? $product->price;
            $checkOriginal = $validated['original_price'] ?? $product->original_price;
            if (!empty($checkOriginal) && (float) $checkOriginal <= (float) $checkPrice) {
                return response()->json([
                    'message' => 'The original price must be greater than the active sale price.',
                    'errors'  => ['original_price' => ['Original price must be greater than the current sale price.']],
                ], 422);
            }

            $product->update($validated);

            return response()->json([
                'message' => 'Product updated successfully!',
                'product' => $product->load(['productGroup']),
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Product not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Update product error: ' . $e->getMessage(), ['id' => $id]);
            return response()->json([
                'message' => 'Failed to update product.',
            ], 500);
        }
    }

    // 8. Delete a Product
    public function deleteProduct($id)
    {
        try {
            $product = Product::findOrFail($id);
            $product->delete();

            return response()->json([
                'message' => 'Product deleted successfully.',
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Product not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Delete product error: ' . $e->getMessage(), ['id' => $id]);
            return response()->json([
                'message' => 'Failed to delete product.',
            ], 500);
        }
    }

    // 9. List All Product Groups (with product count)
    public function listProductGroups()
    {
        try {
            $groups = ProductGroup::withCount('products')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($groups, 200);
        } catch (\Exception $e) {
            Log::error('List product groups error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load categories.',
            ], 500);
        }
    }

    // 10. Create a New Category (Product Group)
    public function storeProductGroup(Request $request)
    {
        try {
            $validated = $request->validate([
                'name'           => 'required|string|max:255',
                'classification' => 'nullable|string|max:100',
                'slug'           => 'nullable|string|max:255',
                'image_url'      => 'nullable|string|max:2048',
                'sku_prefix'     => 'nullable|string|max:10',
            ]);

            if (empty($validated['slug'])) {
                $base = trim(strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $validated['name'])), '-');
                $slug = $base;
                $i = 1;
                while (ProductGroup::where('slug', $slug)->exists()) {
                    $slug = $base . '-' . $i++;
                }
                $validated['slug'] = $slug;
            } else {
                if (ProductGroup::where('slug', $validated['slug'])->exists()) {
                    return response()->json([
                        'message' => 'That slug is already in use.',
                    ], 422);
                }
            }

            if (empty($validated['image_url'])) {
                $validated['image_url'] = 'https://placehold.co/600x400?text=' . urlencode($validated['name']);
            }

            $group = ProductGroup::create($validated);

            return response()->json([
                'message' => 'Category created successfully!',
                'group'   => $group,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Store product group error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to create category.',
            ], 500);
        }
    }

    // 11. Delete a Category (Product Group)
    public function deleteProductGroup($id)
    {
        try {
            $group = ProductGroup::findOrFail($id);
            $group->delete();

            return response()->json([
                'message' => 'Category deleted successfully.',
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Category not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Delete product group error: ' . $e->getMessage(), ['id' => $id]);
            return response()->json([
                'message' => 'Failed to delete category.',
            ], 500);
        }
    }

    // ─── Trade Management ──────────────────────────────────────────

    // 12. List all trade requests
    public function listTrades()
    {
        try {
            $trades = Trade::orderBy('created_at', 'desc')->get();
            return response()->json($trades, 200);
        } catch (\Exception $e) {
            Log::error('List trades error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load trade requests.',
            ], 500);
        }
    }

    // 13. Update a trade request status
    public function updateTradeStatus(Request $request, $id)
    {
        try {
            $trade = Trade::findOrFail($id);

            $validated = $request->validate([
                'status' => 'required|in:pending,reviewed,completed,declined',
            ]);

            $oldStatus = $trade->status;
            $trade->status = $validated['status'];
            $trade->save();

            // Send email notification for accepted or declined statuses
            $newStatus = $trade->status;
            if (in_array($newStatus, ['completed', 'reviewed', 'declined']) && !empty($trade->email)) {
                try {
                    Mail::to($trade->email)->send(
                        new TradeStatusNotification($newStatus, $trade->description)
                    );
                } catch (\Exception $e) {
                    Log::error('Trade status email failed: ' . $e->getMessage(), [
                        'trade_id' => $id,
                        'email'    => $trade->email,
                        'status'   => $newStatus,
                    ]);
                }
            }

            return response()->json([
                'message' => 'Trade status updated successfully.',
                'trade'   => $trade,
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Trade request not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Update trade status error: ' . $e->getMessage(), ['id' => $id]);
            return response()->json([
                'message' => 'Failed to update trade status.',
            ], 500);
        }
    }

    // 14. Delete a trade request
    public function deleteTrade($id)
    {
        try {
            $trade = Trade::findOrFail($id);
            $trade->delete();

            return response()->json([
                'message' => 'Trade request deleted successfully.',
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Trade request not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Delete trade error: ' . $e->getMessage(), ['id' => $id]);
            return response()->json([
                'message' => 'Failed to delete trade request.',
            ], 500);
        }
    }

    // ─── Announcement Management ───────────────────────────────────

    // 14. List all announcements
    public function listAnnouncements()
    {
        try {
            $announcements = Announcement::orderBy('created_at', 'desc')->get();
            return response()->json($announcements, 200);
        } catch (\Exception $e) {
            Log::error('List announcements error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load announcements.',
            ], 500);
        }
    }

    // 15. Create a new announcement
    public function storeAnnouncement(Request $request)
    {
        try {
            $validated = $request->validate([
                'title'   => 'required|string|max:255',
                'content' => 'required|string',
                'status'  => 'nullable|in:active,inactive',
            ]);

            $announcement = Announcement::create([
                'title'   => $validated['title'],
                'content' => $validated['content'],
                'status'  => $validated['status'] ?? 'active',
            ]);

            return response()->json([
                'message'      => 'Announcement created successfully!',
                'announcement' => $announcement,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Store announcement error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to create announcement.',
            ], 500);
        }
    }

    // 16. Update an announcement
    public function updateAnnouncement(Request $request, $id)
    {
        try {
            $announcement = Announcement::findOrFail($id);

            $validated = $request->validate([
                'title'   => 'sometimes|required|string|max:255',
                'content' => 'sometimes|required|string',
                'status'  => 'nullable|in:active,inactive',
            ]);

            $announcement->update($validated);

            return response()->json([
                'message'      => 'Announcement updated successfully.',
                'announcement' => $announcement,
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Announcement not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Update announcement error: ' . $e->getMessage(), ['id' => $id]);
            return response()->json([
                'message' => 'Failed to update announcement.',
            ], 500);
        }
    }

    // 17. Delete an announcement
    public function deleteAnnouncement($id)
    {
        try {
            $announcement = Announcement::findOrFail($id);
            $announcement->delete();

            return response()->json([
                'message' => 'Announcement deleted successfully.',
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Announcement not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Delete announcement error: ' . $e->getMessage(), ['id' => $id]);
            return response()->json([
                'message' => 'Failed to delete announcement.',
            ], 500);
        }
    }

    // 18. Delete a transaction (order)
    public function deleteTransaction($id)
    {
        try {
            $transaction = Transaction::findOrFail($id);
            $transaction->delete();

            return response()->json([
                'message' => 'Order deleted successfully.',
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Order not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Delete transaction error: ' . $e->getMessage(), ['id' => $id]);
            return response()->json([
                'message' => 'Failed to delete order.',
            ], 500);
        }
    }

    // 19. Update a product group (category)
    public function updateProductGroup(Request $request, $id)
    {
        try {
            $group = ProductGroup::findOrFail($id);

            $validated = $request->validate([
                'name'           => 'sometimes|required|string|max:255',
                'classification' => 'nullable|string|max:100',
                'slug'           => 'sometimes|required|string|max:255',
                'image_url'      => 'nullable|string|max:2048',
                'sku_prefix'     => 'nullable|string|max:10',
            ]);

            if (isset($validated['slug']) && $validated['slug'] !== $group->slug) {
                if (ProductGroup::where('slug', $validated['slug'])->where('id', '!=', $id)->exists()) {
                    return response()->json([
                        'message' => 'That slug is already in use.',
                    ], 422);
                }
            }

            $group->update($validated);

            return response()->json([
                'message' => 'Category updated successfully!',
                'group'   => $group->loadCount('products'),
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Category not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Update product group error: ' . $e->getMessage(), ['id' => $id]);
            return response()->json([
                'message' => 'Failed to update category.',
            ], 500);
        }
    }

    /**
     * List all non-admin users with transaction stats and velocity flags.
     */
    public function listUsers(Request $request)
    {
        try {
            $users = User::where('is_admin', false)
                ->withCount('transactions')
                ->with(['transactions' => function ($q) {
                    $q->select('id', 'user_id', 'created_at', 'price')
                      ->orderBy('created_at', 'desc')
                      ->limit(5);
                }])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($user) {
                    // Velocity: count transactions in last 1 hour
                    $lastHourCount = Transaction::where('user_id', $user->id)
                        ->where('created_at', '>=', now()->subHour())
                        ->count();

                    // Velocity: count transactions in last 24 hours
                    $last24hCount = Transaction::where('user_id', $user->id)
                        ->where('created_at', '>=', now()->subDay())
                        ->count();

                    // Total spend in last 24 hours
                    $last24hSpend = Transaction::where('user_id', $user->id)
                        ->where('created_at', '>=', now()->subDay())
                        ->sum('price');

                    // Trade velocity: count trades linked by email
                    $tradeCount = Trade::where('email', $user->email)->count();

                    $tradeLastHour = Trade::where('email', $user->email)
                        ->where('created_at', '>=', now()->subHour())
                        ->count();

                    $tradeLast24h = Trade::where('email', $user->email)
                        ->where('created_at', '>=', now()->subDay())
                        ->count();

                    $velocityFlags = [];
                    if ($lastHourCount >= 5) {
                        $velocityFlags[] = [
                            'level' => 'high',
                            'type' => 'hourly_volume',
                            'message' => "{$lastHourCount} purchases in the last hour",
                        ];
                    } elseif ($lastHourCount >= 3) {
                        $velocityFlags[] = [
                            'level' => 'medium',
                            'type' => 'hourly_volume',
                            'message' => "{$lastHourCount} purchases in the last hour",
                        ];
                    }

                    if ($last24hCount >= 15) {
                        $velocityFlags[] = [
                            'level' => 'high',
                            'type' => 'daily_volume',
                            'message' => "{$last24hCount} purchases in 24 hours",
                        ];
                    }

                    if ($last24hSpend >= 100000) {
                        $velocityFlags[] = [
                            'level' => 'high',
                            'type' => 'daily_spend',
                            'message' => '৳' . number_format($last24hSpend) . ' spent in 24 hours',
                        ];
                    }

                    // Trade velocity flags
                    if ($tradeLastHour >= 3) {
                        $velocityFlags[] = [
                            'level' => 'high',
                            'type' => 'trade_hourly_volume',
                            'message' => "{$tradeLastHour} trade requests in the last hour",
                        ];
                    } elseif ($tradeLastHour >= 1) {
                        $velocityFlags[] = [
                            'level' => 'medium',
                            'type' => 'trade_hourly_volume',
                            'message' => "{$tradeLastHour} trade request in the last hour",
                        ];
                    }

                    if ($tradeLast24h >= 10) {
                        $velocityFlags[] = [
                            'level' => 'high',
                            'type' => 'trade_daily_volume',
                            'message' => "{$tradeLast24h} trade requests in 24 hours",
                        ];
                    }

                    $lastPurchase = $user->transactions->first()?->created_at;

                    return [
                        'id'                 => $user->id,
                        'name'               => $user->name,
                        'email'              => $user->email,
                        'points'             => $user->points,
                        'is_banned'          => (bool) $user->is_banned,
                        'transactions_count' => $user->transactions_count,
                        'last_purchase_at'   => $lastPurchase,
                        'velocity_1h'        => $lastHourCount,
                        'velocity_24h'       => $last24hCount,
                        'spend_24h'          => $last24hSpend,
                        'velocity_flags'     => $velocityFlags,
                        'trade_count'        => $tradeCount,
                        'trade_velocity_1h'  => $tradeLastHour,
                        'trade_velocity_24h' => $tradeLast24h,
                        'created_at'         => $user->created_at,
                    ];
                });

            return response()->json($users, 200);
        } catch (\Exception $e) {
            Log::error('List users error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load users.',
            ], 500);
        }
    }

    /**
     * Ban a user: set is_banned=true and revoke all Sanctum tokens.
     */
    public function banUser(Request $request, $id)
    {
        try {
            $user = User::find($id);

            if (! $user) {
                return response()->json([
                    'message' => 'User not found.',
                ], 404);
            }

            if ($user->is_admin) {
                return response()->json([
                    'message' => 'Cannot ban an admin user.',
                ], 403);
            }

            $user->update(['is_banned' => true]);

            // Revoke all sanctum tokens to force re-login
            $user->tokens()->delete();

            Log::info("User #{$user->id} ({$user->email}) banned by admin.");

            return response()->json([
                'message' => "{$user->name} has been banned. All active sessions revoked.",
                'user'    => [
                    'id'        => $user->id,
                    'name'      => $user->name,
                    'email'     => $user->email,
                    'is_banned' => true,
                ],
            ], 200);
        } catch (\Exception $e) {
            Log::error('Ban user error: ' . $e->getMessage(), ['id' => $id]);
            return response()->json([
                'message' => 'Failed to ban user.',
            ], 500);
        }
    }

    /**
     * Unban a user: set is_banned=false.
     */
    public function unbanUser(Request $request, $id)
    {
        try {
            $user = User::find($id);

            if (! $user) {
                return response()->json([
                    'message' => 'User not found.',
                ], 404);
            }

            $user->update(['is_banned' => false]);

            Log::info("User #{$user->id} ({$user->email}) unbanned by admin.");

            return response()->json([
                'message' => "{$user->name} has been unbanned.",
                'user'    => [
                    'id'        => $user->id,
                    'name'      => $user->name,
                    'email'     => $user->email,
                    'is_banned' => false,
                ],
            ], 200);
        } catch (\Exception $e) {
            Log::error('Unban user error: ' . $e->getMessage(), ['id' => $id]);
            return response()->json([
                'message' => 'Failed to unban user.',
            ], 500);
        }
    }

    /**
     * Delete a user and all their associated data.
     */
    public function deleteUser(Request $request, $id)
    {
        try {
            $user = User::find($id);

            if (! $user) {
                return response()->json([
                    'message' => 'User not found.',
                ], 404);
            }

            if ($user->is_admin) {
                return response()->json([
                    'message' => 'Cannot delete an admin user.',
                ], 403);
            }

            // Delete all related transactions
            Transaction::where('user_id', $user->id)->delete();

            // Revoke all tokens
            $user->tokens()->delete();

            // Finally delete the user
            $user->delete();

            Log::info("User #{$id} ({$user->email}) deleted by admin.");

            return response()->json([
                'message' => "{$user->name} has been permanently deleted.",
            ], 200);
        } catch (\Exception $e) {
            Log::error('Delete user error: ' . $e->getMessage(), ['id' => $id]);
            return response()->json([
                'message' => 'Failed to delete user.',
            ], 500);
        }
    }

    /**
     * Update a user's loyalty points balance.
     */
    public function updateUserPoints(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'points' => 'required|integer|min:0',
            ]);

            $user = User::find($id);

            if (! $user) {
                return response()->json([
                    'message' => 'User not found.',
                ], 404);
            }

            $oldPoints = $user->points;
            $user->update(['points' => $validated['points']]);

            Log::info("User #{$user->id} ({$user->email}) points adjusted from {$oldPoints} to {$validated['points']} by admin.");

            return response()->json([
                'message' => "{$user->name}'s points updated from {$oldPoints} to {$validated['points']}.",
                'user'    => [
                    'id'     => $user->id,
                    'name'   => $user->name,
                    'points' => $user->points,
                ],
            ], 200);
        } catch (\Exception $e) {
            Log::error('Update user points error: ' . $e->getMessage(), ['id' => $id]);
            return response()->json([
                'message' => 'Failed to update points.',
            ], 500);
        }
    }
}
