<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request; 
use App\Models\Transaction;
use App\Models\ProductGroup;

class ProductGroupController extends Controller
{
    public function checkout(Request $request)
    {
        // 1. Force strict data filtering and unique validation check
        $validated = $request->validate([
            'transaction_id'      => 'required|string|unique:transactions,transaction_id',
            'product_name'        => 'required|string',
            'product_id'          => 'nullable|exists:products,id',
            'price'               => 'required|numeric|min:0',
            'customer_email'      => 'nullable|email',
            'account_credentials' => 'nullable|string',
            'custom_fields'       => 'nullable|array',
        ]);

        $userId = null;

        // Detect authenticated customer via Sanctum
        $user = auth('sanctum')->user();
        if ($user) {
            $userId = $user->id;
        }

        // 2. Create the transaction
        $transaction = Transaction::create([
            'user_id'             => $userId,
            'transaction_id'      => $validated['transaction_id'],
            'product_name'        => $validated['product_name'],
            'product_id'          => $validated['product_id'] ?? null,
            'price'               => $validated['price'],
            'customer_email'      => $validated['customer_email'] ?? null,
            'account_credentials' => $validated['account_credentials'] ?? null,
            'custom_fields'       => $validated['custom_fields'] ?? null,
            'status'              => 'pending',
        ]);

        // 3. Return successful JSON response
        return response()->json([
            'success' => true,
            'message' => 'Transaction verified and saved successfully!',
            'data'    => $transaction,
        ], 201);
    }
    public function index()
    {
        // Fetch all product groups with their products so the frontend mega-menu
        // can filter games to only those that carry a given product type.
        $categories = ProductGroup::with(['products'])->get();

        return response()->json($categories, 200);
    }
    public function show($slug)
    {
        // Find the category by its slug column, along with its associated products
        // Eager-load the products so the storefront can render them
        $category = ProductGroup::with(['products'])->where('slug', $slug)->first();

        // If the category doesn't exist, return a clean 404 JSON response instead of a 500 crash
        if (!$category) {
            return response()->json([
                'message' => 'Category not found'
            ], 404);
        }

        return response()->json($category, 200);
    }
    public function store(Request $request)
{
    // Validate that the name field arrived safely
    $validated = $request->validate([
        'transaction_id'      => 'required|string|unique:transactions,transaction_id',
        'product_name'        => 'required|string',
        'account_credentials' => 'required|string',
        'amount'              => 'nullable|numeric|min:0',
    ]);

    // Create the transaction record directly
    $transaction = Transaction::create([
        'transaction_id'      => $validated['transaction_id'],
        'product_name'        => $validated['product_name'],
        'account_credentials' => $validated['account_credentials'],
        'amount'              => $validated['amount'] ?? 0,
        'status'              => 'pending',
    ]);

    return response()->json([
        'success' => true,
        'message' => 'Transaction recorded successfully!',
        'data' => $transaction
    ], 201);
}
}