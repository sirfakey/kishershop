<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SecurityHeaders
{
    /**
     * Apply security-hardening HTTP headers to every response.
     *
     * HSTS is only set in production (HTTPS). Other headers are safe in all envs.
     */
    public function handle(Request $request, Closure $next): mixed
    {
        $response = $next($request);

        // Prevent MIME-type sniffing
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // Prevent clickjacking
        $response->headers->set('X-Frame-Options', 'DENY');

        // Enable XSS filter in older browsers
        $response->headers->set('X-XSS-Protection', '1; mode=block');

        // Referrer policy — only send origin for cross-origin requests
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Permissions policy — restrict browser features
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');

        // HSTS — only in production (requires HTTPS)
        if (app()->environment('production') && $request->isSecure()) {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains; preload'
            );
        }

        return $response;
    }
}
