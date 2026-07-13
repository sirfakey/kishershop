<?php

namespace App\Http\Controllers;

use App\Models\Trade;
use Illuminate\Http\Request;

class TradeController extends Controller
{
    /**
     * Submit a trade/exchange request (public — no auth required).
     */
    public function store(Request $request)
    {
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
    }
}
