<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Security hardening headers (HSTS, X-Frame-Options, etc.)
        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);

        // EXEMPT THE CHECKOUT ENDPOINT FROM CSRF VERIFICATION HERE:
        $middleware->validateCsrfTokens(except: [
            'api/checkout',
            'checkout',
            'api/admin/login',
            'admin/login',
            'api/register',
            'register',
            'api/login',
            'login',
            'api/trades',
            'trades',
            'api/verify-email',
            'verify-email',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(function (\Illuminate\Http\Request $request) {
            return $request->expectsJson() || $request->is('api/*');
        });

        // In production, never leak sensitive data in exception responses
        $exceptions->dontReport([]); // will be configured per-environment
        $exceptions->dontFlash([
            'current_password',
            'password',
            'password_confirmation',
        ]);

        // Clean JSON error responses for production
        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => 'The given data was invalid.',
                    'errors'  => $e->errors(),
                ], 422);
            }
        });

        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                ], 401);
            }
        });

        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => 'Resource not found.',
                ], 404);
            }
        });

        // Catch-all for any unhandled exceptions in API context
        $exceptions->render(function (\Throwable $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $status = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500;
                $code   = $status >= 100 && $status < 600 ? $status : 500;

                return response()->json([
                    'message' => app()->environment('production')
                        ? 'An unexpected error occurred.'
                        : $e->getMessage(),
                ], $code);
            }
        });
    })->create();
