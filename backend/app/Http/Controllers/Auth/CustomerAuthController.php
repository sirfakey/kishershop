<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\SendVerificationCode;
use App\Models\Trade;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
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

            // Generate a random 6-digit verification code
            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

            $user = User::create([
                'name'              => $validated['name'],
                'email'             => $validated['email'],
                'password'          => Hash::make($validated['password']),
                'verification_code' => $code,
            ]);

            // Send verification email
            try {
                Mail::to($user->email)->send(new SendVerificationCode($code, $user->name));
            } catch (\Exception $e) {
                Log::error('Failed to send verification email: ' . $e->getMessage(), [
                    'email' => $user->email,
                ]);
                // Don't fail registration — the code is still stored and can be resent
            }

            return response()->json([
                'message' => 'Account created successfully. Please check your email for the verification code.',
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

            // If email is not verified, generate a new code and send it
            if (! $user->email_verified_at) {
                $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
                $user->verification_code = $code;
                $user->save();

                try {
                    Mail::to($user->email)->send(new SendVerificationCode($code, $user->name));
                } catch (\Exception $e) {
                    Log::error('Failed to send verification email on login: ' . $e->getMessage(), [
                        'email' => $user->email,
                    ]);
                }

                return response()->json([
                    'message'              => 'Email not verified. A new verification code has been sent.',
                    'requires_verification' => true,
                    'email'                => $user->email,
                ], 200);
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

            // Verify the submitted code matches the stored code
            if (! $user->verification_code || $user->verification_code !== $validated['code']) {
                return response()->json([
                    'message' => 'Invalid verification code. Please check your email and try again.',
                ], 422);
            }

            // Mark email as verified and clear the code
            $user->verification_code = null;
            $user->email_verified_at = now();
            $user->save();

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
     * Resend verification code to an unverified email.
     */
    public function resendVerification(Request $request)
    {
        try {
            $validated = $request->validate([
                'email' => 'required|email|exists:users,email',
            ]);

            $user = User::where('email', $validated['email'])->first();

            // No need to resend if already verified
            if ($user->email_verified_at) {
                return response()->json([
                    'message' => 'Email is already verified. You can log in.',
                ], 200);
            }

            // Generate a fresh code
            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $user->verification_code = $code;
            $user->save();

            try {
                Mail::to($user->email)->send(new SendVerificationCode($code, $user->name));
            } catch (\Exception $e) {
                Log::error('Failed to resend verification email: ' . $e->getMessage(), [
                    'email' => $user->email,
                ]);
            }

            return response()->json([
                'message' => 'A new verification code has been sent to your email.',
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Resend verification error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to resend code. Please try again.',
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
