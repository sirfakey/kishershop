#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# KisherShop — Hostinger (cPanel) Deployment Script
# -----------------------------------------------------------------------------
# Run this on the server after pushing new code, or set it as a post-receive
# Git hook for automated deployments.
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Requirements on the server:
#   - PHP 8.2+ with composer
#   - Node.js 18+ with npm (for the frontend build)
#   - MySQL database already created
# -----------------------------------------------------------------------------

set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

echo "==> Installing PHP dependencies..."
composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev

echo "==> Building frontend React SPA..."
cd frontend
npm ci --production=false
npm run build
cd "$APP_DIR"

echo "==> Copying frontend dist into public/..."
cp -r frontend/dist/* public/
# Also copy asset directories (CSS, JS, images etc.) to the right spot
if [ -d "frontend/dist/assets" ]; then
    cp -r frontend/dist/assets public/ 2>/dev/null || true
fi

echo "==> Building backend Vite assets (Laravel resources)..."
npm ci --production=false
npm run build
# Laravel's @vite directive expects assets in public/build/,
# but outDir is set to 'dist' for Hostinger deploy-tool compatibility.
# Copy dist/ contents to public/build/ so @vite works correctly.
if [ -d "dist" ]; then
    mkdir -p public/build
    cp -r dist/* public/build/ 2>/dev/null || true
fi

echo "==> Running database migrations..."
php artisan migrate --force

echo "==> Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "==> Creating storage symlink (if missing)..."
php artisan storage:link 2>/dev/null || echo "    (symlink already exists or couldn't be created — verify manually)"

echo ""
echo "✅ Deployment complete."
echo ""
echo "   Post-deploy checklist:"
echo "   1. Verify the site loads at your domain"
echo "   2. Check storage/app/public is writable"
echo "   3. Confirm .env APP_ENV=production, APP_DEBUG=false"
echo "   4. Run 'php artisan queue:restart' if using queues"
echo ""
