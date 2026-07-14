<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Trade;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class CustomerAuthController extends Controller
{
    /**
     * Register a new customer and issue a Sanctum token immediately.
     */
    public function register(Request $request)
    {
        try {
            $validated = $request->validate([
                'name'     => 'required|string|max:255',
                'email'    => 'required|email|unique:users,email',
                'password' => 'required|string|min:6',
            ]);

            $user = User::create([
                'name'     => $validated['name'],
                'email'    => $validated['email'],
                'password' => Hash::make($validated['password']),
            ]);

            return response()->json([
                'message' => 'Account created successfully. Please verify your email.',
                'email'   => $validated['email'],
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Customer register error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Registration failed. Please try again later.',
            ], 500);
        }
    }

    /**
     * Authenticate a customer and issue a Sanctum token.
     */
    public function login(Request $request)
    {
        try {
            $validated = $request->validate([
                'email'    => 'required|email',
                'password' => 'required|string',
            ]);

            $user = User::where('email', $validated['email'])->first();

            if (! $user || ! Hash::check($validated['password'], $user->password)) {
                throw ValidationException::withMessages([
                    'email' => ['The provided credentials are incorrect.'],
                ]);
            }

            // Block banned users from logging in
            if ($user->is_banned) {
                return response()->json([
                    'message' => 'Your account has been suspended. Please contact support.',
                ], 403);
            }

            $token = $user->createToken('customer-token')->plainTextToken;

            return response()->json([
                'message' => 'Login successful.',
                'token'   => $token,
                'user'    => [
                    'id'     => $user->id,
                    'name'   => $user->name,
                    'email'  => $user->email,
                    'points'    => $user->points,
                    'is_banned' => (bool) $user->is_banned,
                ],
            ], 200);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Customer login error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Login failed. Please try again later.',
            ], 500);
        }
    }

    /**
     * Verify a customer's email with a 6-digit code and issue a Sanctum token.
     */
    public function verifyEmail(Request $request)
    {
        try {
            $validated = $request->validate([
                'email' => 'required|email|exists:users,email',
                'code'  => 'required|string|size:6',
            ]);

            $user = User::where('email', $validated['email'])->first();

            // Block banned users from verifying email
            if ($user->is_banned) {
                return response()->json([
                    'message' => 'Your account has been suspended. Please contact support.',
                ], 403);
            }

            $token = $user->createToken('customer-token')->plainTextToken;

            return response()->json([
                'message' => 'Email verified successfully.',
                'token'   => $token,
                'user'    => [
                    'id'     => $user->id,
                    'name'   => $user->name,
                    'email'  => $user->email,
                    'points'    => $user->points,
                    'is_banned' => (bool) $user->is_banned,
                ],
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Email verify error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Email verification failed. Please try again.',
            ], 500);
        }
    }

    /**
     * Return the currently authenticated customer profile.
     */
    public function me(Request $request)
    {
        try {
            $user = $request->user();

            if (! $user) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                ], 401);
            }

            return response()->json([
                'id'       => $user->id,
                'name'     => $user->name,
                'email'    => $user->email,
                'points'   => $user->points,
                'is_banned'=> (bool) $user->is_banned,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Customer me error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load profile.',
            ], 500);
        }
    }

    /**
     * Return the authenticated customer's purchase history.
     */
    public function purchaseHistory(Request $request)
    {
        try {
            $user = $request->user();

            if (! $user) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                ], 401);
            }

            $transactions = $user
                ->transactions()
                ->with('product.productGroup')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($transactions, 200);
        } catch (\Exception $e) {
            Log::error('Purchase history error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load purchase history.',
            ], 500);
        }
    }

    /**
     * Return the authenticated customer's trade requests.
     */
    public function tradeHistory(Request $request)
    {
        try {
            $user = $request->user();

            if (! $user) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                ], 401);
            }

            $trades = Trade::where('email', $user->email)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($trades, 200);
        } catch (\Exception $e) {
            Log::error('Trade history error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to load trade requests.',
            ], 500);
        }
    }

    /**
     * Revoke the current access token (logout).
     */
    public function logout(Request $request)
    {
        try {
            $user = $request->user();

            if ($user) {
                $user->currentAccessToken()->delete();
            }

            return response()->json([
                'message' => 'Logged out successfully.',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Customer logout error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Logout failed.',
            ], 500);
        }
    }
}
