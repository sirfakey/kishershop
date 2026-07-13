<?php

namespace App\Http\Controllers;

use App\Models\ProductGroup;
use App\Models\Transaction;
use App\Models\Product;
use App\Models\Trade;
use App\Models\Announcement;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminController extends Controller
{
    // 1. Fetch High-Level Store Statistics
    public function getStats()
    {
        $totalSalesCount = Transaction::where('status', 'completed')->count();
        $totalRevenue = Transaction::where('status', 'completed')->sum('price');
        $unfulfilledCount = Transaction::where('status', 'pending')->count();

        return response()->json([
            'total_sales' => $totalSalesCount,
            'total_revenue' => (float) $totalRevenue,
            'unfulfilled_orders' => $unfulfilledCount,
        ], 200);
    }

    // 2. List All Orders/Transactions (with product eager-loaded for SKU)
    public function getTransactions()
    {
        $transactions = Transaction::with('product.productGroup')
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json($transactions, 200);
    }

    // 3. Toggle Order State to Completed (legacy; use updateTransactionStatus for full control)
    public function fulfillTransaction($id)
    {
        $transaction = Transaction::findOrFail($id);
        $transaction->status = 'completed';
        $transaction->save();

        return response()->json([
            'message' => 'Order marked as completed successfully!',
            'transaction' => $transaction
        ], 200);
    }

    // 3b. Update order status to any valid value
    public function updateTransactionStatus(Request $request, $id)
    {
        $transaction = Transaction::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:pending,completed,refunded',
        ]);

        $transaction->status = $validated['status'];
        $transaction->save();

        return response()->json([
            'message' => 'Order status updated successfully!',
            'transaction' => $transaction->load('product.productGroup'),
        ], 200);
    }

    // 4. Create a New Digital Product
    public function storeProduct(Request $request)
    {
        $validated = $request->validate([
            'name'              => 'required|string|max:255',
            'price'             => 'required|numeric|min:0',
            'product_group_id'  => 'required|exists:product_groups,id',
            'type'              => 'required|string', // e.g., 'gift-cards', 'accounts', 'currency', 'items', 'boosting'
            'custom_form_code'  => 'nullable|string',
            'sku'               => 'nullable|string|unique:products,sku',
            'image_url'         => 'nullable|string|max:2048',
        ]);

        $product = Product::create($validated);

        return response()->json([
            'message' => 'Product created successfully!',
            'product' => $product
        ], 201);
    }

    // 5. Native CSV Export Spreadsheet Stream
    public function exportTransactionsCsv(): StreamedResponse
    {
        $fileName = 'kishershop_sales_' . date('Y-m-d') . '.csv';
        $transactions = Transaction::orderBy('created_at', 'desc')->get();

        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=$fileName",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $callback = function() use($transactions) {
            $file = fopen('php://output', 'w');
            
            // CSV Header Row
            fputcsv($file, ['ID', 'Transaction ID', 'Price', 'Status', 'Date Created']);

            foreach ($transactions as $row) {
                fputcsv($file, [
                    $row->id,
                    $row->transaction_id, // Matches your database bKash/custom id string
                    $row->price,
                    $row->status,
                    $row->created_at,
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    // 6. List All Products (with their group & checkout form)
    public function listProducts()
    {
        $products = Product::with(['productGroup'])->orderBy('created_at', 'desc')->get();

        return response()->json($products, 200);
    }

    // 7. Update a Product
    public function updateProduct(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'name'              => 'sometimes|required|string|max:255',
            'price'             => 'sometimes|required|numeric|min:0',
            'product_group_id'  => 'sometimes|required|exists:product_groups,id',
            'type'              => 'sometimes|required|string',
            'custom_form_code'  => 'nullable|string',
            'sku'               => 'nullable|string|unique:products,sku,' . $id,
            'image_url'         => 'nullable|string|max:2048',
        ]);

        $product->update($validated);

        return response()->json([
            'message' => 'Product updated successfully!',
            'product' => $product->load(['productGroup']),
        ], 200);
    }

    // 8. Delete a Product
    public function deleteProduct($id)
    {
        $product = Product::findOrFail($id);
        $product->delete();

        return response()->json([
            'message' => 'Product deleted successfully.',
        ], 200);
    }

    // 9. List All Product Groups (with product count)
    public function listProductGroups()
    {
        $groups = ProductGroup::withCount('products')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($groups, 200);
    }

    // 10. Create a New Category (Product Group)
    public function storeProductGroup(Request $request)
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'slug'       => 'nullable|string|max:255',
            'image_url'  => 'nullable|string|max:2048',
            'sku_prefix' => 'nullable|string|max:10',
        ]);

        // Auto-generate a unique slug from the name if one wasn't supplied
        if (empty($validated['slug'])) {
            $base = trim(strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $validated['name'])), '-');
            $slug = $base;
            $i = 1;
            while (ProductGroup::where('slug', $slug)->exists()) {
                $slug = $base . '-' . $i++;
            }
            $validated['slug'] = $slug;
        } else {
            // Enforce uniqueness for user-supplied slugs
            if (ProductGroup::where('slug', $validated['slug'])->exists()) {
                return response()->json([
                    'message' => 'That slug is already in use.',
                ], 422);
            }
        }

        // Fall back to a placeholder image if none was provided
        if (empty($validated['image_url'])) {
            $validated['image_url'] = 'https://placehold.co/600x400?text=' . urlencode($validated['name']);
        }

        $group = ProductGroup::create($validated);

        return response()->json([
            'message' => 'Category created successfully!',
            'group'   => $group,
        ], 201);
    }

    // 11. Delete a Category (Product Group) — products cascade-delete via FK
    public function deleteProductGroup($id)
    {
        $group = ProductGroup::findOrFail($id);
        $group->delete();

        return response()->json([
            'message' => 'Category deleted successfully.',
        ], 200);
    }

    // ─── Trade Management ──────────────────────────────────────────

    // 12. List all trade requests
    public function listTrades()
    {
        $trades = Trade::orderBy('created_at', 'desc')->get();
        return response()->json($trades, 200);
    }

    // 13. Update a trade request status
    public function updateTradeStatus(Request $request, $id)
    {
        $trade = Trade::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:pending,reviewed,completed,declined',
        ]);

        $trade->status = $validated['status'];
        $trade->save();

        return response()->json([
            'message' => 'Trade status updated successfully.',
            'trade'   => $trade,
        ], 200);
    }

    // ─── Announcement Management ───────────────────────────────────

    // 14. List all announcements
    public function listAnnouncements()
    {
        $announcements = Announcement::orderBy('created_at', 'desc')->get();
        return response()->json($announcements, 200);
    }

    // 15. Create a new announcement
    public function storeAnnouncement(Request $request)
    {
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
    }

    // 16. Update an announcement
    public function updateAnnouncement(Request $request, $id)
    {
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
    }

    // 17. Delete an announcement
    public function deleteAnnouncement($id)
    {
        $announcement = Announcement::findOrFail($id);
        $announcement->delete();

        return response()->json([
            'message' => 'Announcement deleted successfully.',
        ], 200);
    }
}