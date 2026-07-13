<?php

namespace App\Http\Controllers;

use App\Models\Trade;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TradeController extends Controller
{
    /**
     * Submit a trade/exchange request (public — no auth required).
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'email'           => 'nullable|email',
                'whatsapp_number' => 'required|string',
                'description'     => 'required|string',
            ]);

            $trade = Trade::create([
                'email'           => $validated['email'] ?? null,
                'whatsapp_number' => $validated['whatsapp_number'],
                'description'     => $validated['description'],
                'status'          => 'pending',
            ]);

            return response()->json([
                'message' => 'Trade request submitted successfully!',
                'trade'   => $trade,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Trade store error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to submit trade request. Please try again later.',
            ], 500);
        }
    }
}
