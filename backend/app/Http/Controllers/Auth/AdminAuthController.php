<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AdminAuthController extends Controller
{
    /**
     * Authenticate an admin and issue a Sanctum token.
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

            // Guard: only admin users can log in here
            if (! $user->is_admin) {
                throw ValidationException::withMessages([
                    'email' => ['This account does not have admin privileges.'],
                ]);
            }

            // Issue a Sanctum token with admin abilities
            $token = $user->createToken('admin-token', ['admin'])->plainTextToken;

            return response()->json([
                'message' => 'Login successful.',
                'token'   => $token,
                'user'    => [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                ],
            ], 200);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Admin login error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Login failed. Please try again later.',
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
            Log::error('Admin logout error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Logout failed.',
            ], 500);
        }
    }
}
