<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Transaction;
use App\Models\ProductGroup;
use App\Models\Coupon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProductGroupController extends Controller
{
    public function checkout(Request $request)
    {
        try {
            // 1. Force strict data filtering and unique validation check
            //    Accepts BOTH single-product (backward compat) and multi-item payloads
            $validated = $request->validate([
                'transaction_id'      => 'required|string|unique:transactions,transaction_id',
                'product_name'        => 'nullable|string|required_without:items',
                'product_id'          => 'nullable|exists:products,id',
                'price'               => 'nullable|numeric|min:0|required_without:items',
                'items'                 => 'nullable|array|min:1',
                'items.*.product_id'    => 'required_with:items|exists:products,id',
                'items.*.quantity'      => 'required_with:items|integer|min:1',
                'items.*.custom_fields' => 'nullable|array',
                'customer_email'        => 'nullable|email',
                'account_credentials'   => 'nullable|string',
                'custom_fields'         => 'nullable|array',
                'seller_notes'          => 'nullable|string|max:2000',
                'points_to_redeem'      => 'nullable|integer|min:0',
                'coupon_code'           => 'nullable|string',
                'gateway'               => 'nullable|string|in:bkash,nagad',
            ]);

            $userId = null;
            $pointsEarned = 0;
            $pointsRedeemed = 0;
            $couponId = null;
            $couponDiscount = 0;

            // ─── Price resolution ────────────────────────────────────────
            $lineItems = null;
            $totalQuantity = 1;

            if (!empty($validated['items'])) {
                // Multi-item path — fetch prices from DB (NEVER trust client)
                $lineItems = [];
                $lineItemProductId = null;
                $lineItemProductName = null;
                $aggregatePrice = 0;

                foreach ($validated['items'] as $item) {
                    $product = \App\Models\Product::findOrFail($item['product_id']);
                    $qty = (int) $item['quantity'];
                    $unitPrice = (float) $product->price;
                    $subtotal = $unitPrice * $qty;
                    $lineItems[] = [
                        'product_id'   => $product->id,
                        'product_name' => $product->name,
                        'price'        => $unitPrice,
                        'quantity'     => $qty,
                        'subtotal'     => $subtotal,
                        'custom_fields' => $item['custom_fields'] ?? null,
                    ];
                    $aggregatePrice += $subtotal;
                }
                $finalPrice = $aggregatePrice;
                $totalQuantity = array_sum(array_column($lineItems, 'quantity'));
                $lineItemProductId = $lineItems[0]['product_id'];
                $lineItemProductName = count($lineItems) === 1
                    ? $lineItems[0]['product_name']
                    : $lineItems[0]['product_name'] . ' & ' . (count($lineItems) - 1) . ' more';
            } else {
                // Single-product path (backward compat)
                $finalPrice = (float) $validated['price'];
                $lineItemProductName = $validated['product_name'];
                $lineItemProductId = $validated['product_id'] ?? null;
            }

            // Detect authenticated customer via Sanctum
            $user = auth('sanctum')->user();

            // Feature 1: Enforce mandatory authentication for checkout
            if (! $user) {
                return response()->json([
                    'success' => false,
                    'message' => 'You must be logged in to make a purchase. Please create an account or log in.',
                ], 401);
            }

            // Feature 2: Block banned users from checkout
            if ($user->is_banned) {
                return response()->json([
                    'success' => false,
                    'message' => 'Your account has been suspended. You cannot make purchases at this time.',
                ], 403);
            }

            $userId = $user->id;

            // 2. Validate and apply coupon if provided (case-insensitive)
            $couponWarning = null;
            $couponCode = $validated['coupon_code'] ?? null;
            if ($couponCode) {
                $coupon = Coupon::where('code', strtoupper($couponCode))->first();
                if ($coupon && $coupon->isValidFor($finalPrice)) {
                    $couponId = $coupon->id;
                    $couponDiscount = (float) $coupon->calculateDiscount($finalPrice);
                    $finalPrice = max(0, $finalPrice - $couponDiscount);
                } else {
                    // Coupon was submitted but couldn't be applied
                    $couponWarning = $coupon
                        ? 'The coupon "' . $couponCode . '" is expired, has reached its usage limit, or the minimum purchase amount is not met.'
                        : 'The coupon code "' . $couponCode . '" was not found.';
                }
            }

            // 3. Process loyalty points (load fresh user points if redeeming)
            if ($userId && isset($validated['points_to_redeem']) && $validated['points_to_redeem'] > 0) {
                // Re-fetch user for fresh points value before deduction
                $user = \App\Models\User::find($userId);
                if (! $user) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Authenticated user not found.',
                    ], 401);
                }
                $pointsToRedeem = (int) $validated['points_to_redeem'];
                $pointsToRedeem = min($pointsToRedeem, (int) $user->points);
                $pointsToRedeem = min($pointsToRedeem, (int) floor($finalPrice));

                if ($pointsToRedeem > 0) {
                    $pointsRedeemed = $pointsToRedeem;
                    $finalPrice = max(0, $finalPrice - $pointsRedeemed);
                }
            }

            // 4. Calculate points earned (1 point per 100 ৳ spent)
            $pointsEarned = (int) floor($finalPrice / 100);

            // 5. Atomic DB transaction: coupon increment + points deduction + transaction + points earning
            DB::transaction(function () use (
                $userId, $validated, $finalPrice, $couponCode, $couponId,
                $couponDiscount, $pointsEarned, $pointsRedeemed,
                $lineItems, $totalQuantity, $lineItemProductName, $lineItemProductId
            ) {
                // Atomically increment coupon usage, enforcing max_uses limit
                // Uses a conditional increment: only succeeds if under the limit
                if ($couponId) {
                    $affected = Coupon::where('id', $couponId)
                        ->where(function ($q) {
                            $q->whereNull('max_uses')
                              ->orWhereRaw('used_count < max_uses');
                        })
                        ->increment('used_count');

                    if ($affected === 0) {
                        throw new \RuntimeException('Coupon usage limit reached.');
                    }
                }

                // Deduct points atomically
                if ($userId && $pointsRedeemed > 0) {
                    \App\Models\User::where('id', $userId)->decrement('points', $pointsRedeemed);
                }

                // Create the transaction
                Transaction::create([
                    'user_id'             => $userId,
                    'transaction_id'      => $validated['transaction_id'],
                    'product_name'        => $lineItemProductName,
                    'product_id'          => $lineItemProductId,
                    'price'               => $finalPrice,
                    'items'               => $lineItems,
                    'quantity'            => $totalQuantity,
                    'customer_email'      => $validated['customer_email'] ?? null,
                    'account_credentials' => $validated['account_credentials'] ?? null,
                    'custom_fields'       => $validated['custom_fields'] ?? null,
                    'seller_notes'        => $validated['seller_notes'] ?? null,
                    'coupon_code'         => $couponCode,
                    'coupon_id'           => $couponId,
                    'coupon_discount'     => $couponDiscount,
                    'points_earned'       => $pointsEarned,
                    'points_redeemed'     => $pointsRedeemed,
                    'gateway'             => $validated['gateway'] ?? null,
                    'status'              => 'pending',
                ]);

                // Points are NOT granted here — they are awarded when the
                // admin marks the order as "completed" via fulfillTransaction
                // or updateTransactionStatus.
            });

            // 6. Fetch the created transaction for the response
            $transaction = Transaction::where('transaction_id', $validated['transaction_id'])->first();

            // 7. Return successful JSON response (include coupon warning if applicable)
            $response = [
                'success' => true,
                'message' => 'Transaction verified and saved successfully!',
                'data'    => $transaction,
            ];

            if ($couponWarning) {
                $response['coupon_warning'] = $couponWarning;
            }

            return response()->json($response, 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e; // Let Laravel handle validation errors normally (422)
        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('Checkout DB error: ' . $e->getMessage(), [
                'transaction_id' => $request->input('transaction_id') ?? 'not-provided',
                'trace'          => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'A database error occurred while processing your order. Please try again.',
            ], 500);
        } catch (\Exception $e) {
            Log::error('Checkout error: ' . $e->getMessage(), [
                'transaction_id' => $request->input('transaction_id') ?? 'not-provided',
                'trace'          => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred. Please try again later.',
            ], 500);
        }
    }
    public function index()
    {
        try {
            $categories = ProductGroup::with(['products'])->get();
            return response()->json($categories, 200);
        } catch (\Exception $e) {
            Log::error('Category index error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load categories. Please try again later.',
            ], 500);
        }
    }

    public function show($slug)
    {
        try {
            $category = ProductGroup::with(['products'])->where('slug', $slug)->first();

            if (! $category) {
                return response()->json([
                    'message' => 'Category not found',
                ], 404);
            }

            return response()->json($category, 200);
        } catch (\Exception $e) {
            Log::error('Category show error: ' . $e->getMessage(), ['slug' => $slug]);
            return response()->json([
                'message' => 'Failed to load category details.',
            ], 500);
        }
    }
}