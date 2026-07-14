<?php

namespace App\Http\Controllers;

use App\Models\Coupon;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CouponController extends Controller
{
    /**
     * Public: Validate a coupon code for a given product price.
     */
    public function validateCoupon(Request $request)
    {
        try {
            $validated = $request->validate([
                'code'          => 'required|string',
                'product_price' => 'required|numeric|min:0',
            ]);

            $coupon = Coupon::where('code', strtoupper($validated['code']))->first();

            if (! $coupon) {
                return response()->json([
                    'valid'   => false,
                    'message' => 'Invalid coupon code.',
                ], 200);
            }

            if (! $coupon->isValidFor((float) $validated['product_price'])) {
                return response()->json([
                    'valid'   => false,
                    'message' => 'This coupon is expired, has reached its usage limit, or the minimum purchase amount is not met.',
                ], 200);
            }

            $discount = $coupon->calculateDiscount((float) $validated['product_price']);

            return response()->json([
                'valid'    => true,
                'discount' => $discount,
                'coupon'   => [
                    'code'           => $coupon->code,
                    'discount_type'  => $coupon->discount_type,
                    'discount_value' => (float) $coupon->discount_value,
                ],
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Coupon validation error: ' . $e->getMessage());
            return response()->json([
                'valid'   => false,
                'message' => 'Failed to validate coupon. Please try again.',
            ], 500);
        }
    }

    /**
     * Admin: List all coupons with usage stats.
     */
    public function index()
    {
        try {
            $coupons = Coupon::orderBy('created_at', 'desc')->get();
            return response()->json($coupons, 200);
        } catch (\Exception $e) {
            Log::error('Coupon index error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load coupons.',
            ], 500);
        }
    }

    /**
     * Admin: Create a new coupon.
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'code'           => 'required|string|unique:coupons,code',
                'discount_type'  => 'required|in:percentage,fixed',
                'discount_value' => 'required|numeric|min:0',
                'min_purchase'   => 'nullable|numeric|min:0',
                'max_uses'       => 'nullable|integer|min:1',
                'expires_at'     => 'nullable|date',
                'is_active'      => 'nullable|boolean',
            ]);

            $coupon = Coupon::create($validated);

            return response()->json([
                'message' => 'Coupon created successfully!',
                'coupon'  => $coupon,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Coupon store error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to create coupon.',
            ], 500);
        }
    }

    /**
     * Admin: Update a coupon.
     */
    public function update(Request $request, $id)
    {
        try {
            $coupon = Coupon::findOrFail($id);

            $validated = $request->validate([
                'code'           => 'sometimes|required|string|unique:coupons,code,' . $id,
                'discount_type'  => 'sometimes|required|in:percentage,fixed',
                'discount_value' => 'sometimes|required|numeric|min:0',
                'min_purchase'   => 'nullable|numeric|min:0',
                'max_uses'       => 'nullable|integer|min:1',
                'expires_at'     => 'nullable|date',
                'is_active'      => 'nullable|boolean',
            ]);

            $coupon->update($validated);

            return response()->json([
                'message' => 'Coupon updated successfully!',
                'coupon'  => $coupon,
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Coupon not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Coupon update error: ' . $e->getMessage(), ['id' => $id]);
            return response()->json([
                'message' => 'Failed to update coupon.',
            ], 500);
        }
    }

    /**
     * Admin: Delete a coupon.
     */
    public function destroy($id)
    {
        try {
            $coupon = Coupon::findOrFail($id);
            $coupon->delete();

            return response()->json([
                'message' => 'Coupon deleted successfully.',
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Coupon not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Coupon destroy error: ' . $e->getMessage(), ['id' => $id]);
            return response()->json([
                'message' => 'Failed to delete coupon.',
            ], 500);
        }
    }

    /**
     * Admin: Export coupon usage as CSV.
     */
    public function export(): StreamedResponse
    {
        try {
            $fileName = 'kisher-shop_coupons_' . date('Y-m-d') . '.csv';
            $coupons = Coupon::orderBy('created_at', 'desc')->get();

            $headers = [
                "Content-type"        => "text/csv",
                "Content-Disposition" => "attachment; filename=$fileName",
                "Pragma"              => "no-cache",
                "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
                "Expires"             => "0"
            ];

            $callback = function () use ($coupons) {
                $file = fopen('php://output', 'w');

                fputcsv($file, ['ID', 'Code', 'Discount Type', 'Discount Value', 'Min Purchase', 'Max Uses', 'Used Count', 'Expires At', 'Active', 'Created At']);

                foreach ($coupons as $row) {
                    fputcsv($file, [
                        $row->id,
                        $row->code,
                        $row->discount_type,
                        $row->discount_value,
                        $row->min_purchase,
                        $row->max_uses ?? 'Unlimited',
                        $row->used_count,
                        $row->expires_at ?? 'Never',
                        $row->is_active ? 'Yes' : 'No',
                        $row->created_at,
                    ]);
                }

                fclose($file);
            };

            return response()->stream($callback, 200, $headers);
        } catch (\Exception $e) {
            Log::error('Coupon export error: ' . $e->getMessage());
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
}
