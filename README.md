# Kisher.Shop

A full-stack digital e-commerce marketplace for the Bangladeshi market — selling gaming keys, gift cards, and digital products. Built with **Laravel 12** (PHP) backend and **React 18 + TypeScript** frontend with **Tailwind CSS v4**.

---

## Architecture Overview

```
kishershop/
├── backend/             # Laravel 12 API + Admin (PHP)
├── frontend/            # React 18 SPA (TypeScript)
├── deploy.py            # Python SFTP deployment script
└── README.md
```

The **backend** serves a RESTful JSON API consumed by the **frontend** React SPA. Admin features share the same Laravel instance with Sanctum token-based authentication. The frontend is built with Vite and deployed as static files alongside the Laravel `index.php` entrypoint on a shared Hostinger server.

---

## Backend (`backend/`)

### Controllers (`backend/app/Http/Controllers/`)

| File | Purpose |
|------|---------|
| `Controller.php` | Base controller class extended by all other controllers. |
| `AdminController.php` | **Core admin logic**: dashboard stats, user listing with velocity metrics (purchase + trade), ban/unban/delete users, CRUD for products, transactions (fulfill, update status, delete), product groups (update), and CSV export. The `listUsers()` method computes per-user velocity flags (hourly/daily purchase volume, spend, trade volume) for fraud detection. |
| `Auth/AdminAuthController.php` | Admin login/logout using Sanctum tokens. Validates admin credentials and returns a bearer token with `admin` abilities. |
| `Auth/CustomerAuthController.php` | Customer registration (with email verification code), login, logout, profile, purchase history (`/api/user/transactions`), and trade history (`/api/user/trades`). Uses Sanctum's `auth:sanctum` guard. |
| `CouponController.php` | Full coupon system: validate a coupon code (`POST /api/coupon/validate`), plus admin CRUD (`GET/POST/PUT/DELETE`) and CSV export. Supports percentage/fixed discounts, expiry dates, min purchase, and max uses. |
| `ProductGroupController.php` | **Checkout endpoint** (`POST /api/checkout`) — the core purchase flow: validates transaction ID uniqueness, enforces mandatory authentication, blocks banned users, applies coupons (with atomic `used_count` increment), processes loyalty points redemption, stores the transaction as `pending`, and returns the result. Also serves category listing (`GET /api/categories`) and single category (`GET /api/categories/{slug}`). Points are **not** granted at checkout — they are awarded only when admin marks the order as "completed." |
| `SettingController.php` | Global key-value settings management. Stores site configuration (site name, logo, payment details, etc.) in the `settings` table. |
| `TradeController.php` | Trade request submission (`POST /api/trade`) — public endpoint. Customers submit descriptions of items they want to trade. Admins review and update status (pending → reviewed → completed/declined). Linked to users by email. |
| `AnnouncementController.php` | CRUD for announcements displayed to customers in the notification dropdown. |
| `ImageUploadController.php` | Handles image file uploads for products and categories. Stores files in Laravel's storage and returns public URLs. |

### Models (`backend/app/Models/`)

| File | Purpose |
|------|---------|
| `User.php` | Customer model with Sanctum tokens. Fields: `name`, `email`, `password`, `points` (loyalty balance), `is_banned` (boolean), `verification_code` (6-digit email verification). |
| `Product.php` | Product model. Fields: `product_group_id`, `name`, `price`, `original_price`, `discount_percentage`, `description`, `image_url`, `sku`, `type`, `checkout_form_id`. Belongs to `ProductGroup`. |
| `ProductGroup.php` | Product category/group. Fields: `name`, `slug`, `image`, `sku_prefix`, `classification` (e.g. "gaming", "gift-cards", "software"). Has many `Product`s. |
| `ProductType.php` | Product type classification (e.g. "Digital Key", "Gift Card", "Account"). Used for categorization within product groups. |
| `Transaction.php` | Purchase/order record. Fields: `user_id`, `transaction_id` (unique), `product_name`, `product_id`, `price`, `customer_email`, `account_credentials`, `custom_fields` (JSON), `coupon_code`, `coupon_id`, `coupon_discount`, `points_earned`, `points_redeemed`, `gateway` (bkash/nagad), `status` (pending/completed/refunded). Belongs to `User` and `Product`. |
| `Coupon.php` | Discount coupon. Fields: `code`, `type` (percentage/fixed), `value`, `min_purchase`, `max_uses`, `used_count`, `expires_at`, `is_active`. Has methods `isValidFor($amount)` and `calculateDiscount($amount)`. |
| `Trade.php` | Trade request. Fields: `email`, `description`, `status` (pending/reviewed/completed/declined). Linked to users by email matching. |
| `Setting.php` | Key-value settings store. Fields: `key`, `value`. |
| `Announcement.php` | Site-wide announcements for the notification bell. Fields: `title`, `message`, `type` (info/warning/success). |

### Mail (`backend/app/Mail/`)

| File | Purpose |
|------|---------|
| `SendVerificationCode.php` | Mailable for sending the 6-digit email verification code to newly registered customers. Uses a Blade template styled with inline CSS. |
| `TradeStatusNotification.php` | Mailable for notifying customers when their trade request status changes (e.g., "Your trade has been reviewed"). |

### Middleware (`backend/app/Http/Middleware/`)

| File | Purpose |
|------|---------|
| `SecurityHeaders.php` | Adds security HTTP headers (CSP, HSTS, X-Frame-Options, etc.) to all responses. |

### Migrations (`backend/database/migrations/`)

Migrations are run in timestamp order. Key ones:

| File | What it creates/modifies |
|------|--------------------------|
| `0001_01_01_000000_create_users_table.php` | Core Laravel users table |
| `2026_07_02_164505_create_product_groups_table.php` | Product categories/groups |
| `2026_07_05_162215_create_products_table.php` | Products table |
| `2026_07_08_154243_add_type_to_products_table.php` | Adds `type` column to products |
| `2026_07_09_174128_create_transactions_table.php` | Purchase transactions |
| `2026_07_09_180849_create_sessions_table.php` | Laravel sessions |
| `2026_07_09_181611_create_personal_access_tokens_table.php` | Sanctum API tokens |
| `2026_07_11_000000_create_settings_table.php` | Settings key-value store |
| `2026_07_11_100000_create_checkout_forms_table.php` | Custom checkout form definitions |
| `2026_07_11_100100_create_checkout_form_fields_table.php` | Fields within checkout forms |
| `2026_07_11_100200_add_checkout_form_id_to_products_table.php` | Links product to checkout form |
| `2026_07_11_200000_add_custom_fields_to_transactions_table.php` | JSON custom fields on transactions |
| `2026_07_11_210000_convert_to_per_product_form_code.php` | Per-product form code migration |
| `2026_07_12_000001_fix_transaction_status_default.php` | Fixes default transaction status |
| `2026_07_12_000002_create_product_types_table.php` | Product type classifications |
| `2026_07_12_000003_add_sku_prefix_to_product_groups.php` | SKU prefix on categories |
| `2026_07_12_000004_add_sku_to_products.php` | SKU on individual products |
| `2026_07_12_000005_add_product_id_to_transactions.php` | Links transactions to products |
| `2026_07_12_000006_create_trades_table.php` | Trade requests table |
| `2026_07_12_000007_create_announcements_table.php` | Announcements table |
| `2026_07_12_000008_add_points_to_users_table.php` | Loyalty points on users |
| `2026_07_12_000009_add_user_id_and_points_to_transactions_table.php` | Points earned/redeemed on transactions |
| `2026_07_12_000010_add_verification_code_to_users_table.php` | Email verification code |
| `2026_07_12_000011_add_image_url_to_products.php` | Image URL on products |
| `2026_07_14_000004_add_gateway_to_transactions.php` | Payment gateway (bkash/nagad) on transactions |
| `2026_07_14_000005_add_discount_percentage_to_products.php` | Auto-calculated discount percentage |
| `2026_07_14_000006_add_is_banned_to_users.php` | Ban flag on users |
| `2026_07_14_000007_add_description_to_products.php` | Product description text |
| `2026_07_14_000008_add_classification_to_product_groups.php` | Category classification tags |

### Routes (`backend/routes/api.php`)

The main API route file. Key endpoint groups:

- **Public**: `GET /api/categories`, `GET /api/categories/{slug}`, `POST /api/trade`, `GET /api/settings`, `GET /api/announcements`
- **Auth (customer)**: `POST /api/register`, `POST /api/login`, `POST /api/verify-email`, `POST /api/logout`, `GET /api/user`, `GET /api/user/transactions`, `GET /api/user/trades`
- **Auth (checkout)**: `POST /api/checkout`
- **Coupon**: `POST /api/coupon/validate`
- **Admin** (requires `abilities:admin`): `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/dashboard`, `GET /api/admin/users`, `POST /api/admin/users/{id}/ban`, `POST /api/admin/users/{id}/unban`, `DELETE /api/admin/users/{id}`, full CRUD for products, transactions, coupons, product groups, trades, announcements, settings, and image uploads.

### Seeders (`backend/database/seeders/`)

| File | Purpose |
|------|---------|
| `DatabaseSeeder.php` | Main seeder that calls all other seeders in order. |
| `AdminSeeder.php` | Creates the default admin account (email: `admin@kisher.shop`). |
| `ProductGroupSeeder.php` | Seeds initial product categories (gaming, gift cards, software, etc.). |
| `SettingSeeder.php` | Seeds default settings (site name, payment numbers, etc.). |

### Other Backend Files

| File | Purpose |
|------|---------|
| `bootstrap/app.php` | Laravel application bootstrap — registers middleware, routes, and service providers. |
| `config/sanctum.php` | Sanctum API token configuration (expiration, abilities). |
| `config/auth.php` | Auth guard/provider configuration. |
| `config/cors.php` | CORS settings for cross-origin requests from the frontend. |
| `config/mail.php` | Email configuration (SMTP for verification codes + trade notifications). |
| `config/filesystems.php` | Storage configuration (local disk for uploaded images). |
| `resources/views/mail/verification-code.blade.php` | Blade template for the 6-digit verification code email. |
| `resources/views/mail/trade-status.blade.php` | Blade template for trade status update notification email. |
| `composer.json` | PHP dependencies (Laravel, Sanctum, etc.). |
| `deploy.sh` | Shell script alternative for backend deployment. |

---

## Frontend (`frontend/`)

### Entry Point & Config

| File | Purpose |
|------|---------|
| `index.html` | HTML shell. Sets `<title>Kisher.Shop</title>`, loads favicon and the Vite-generated JS/CSS bundles. |
| `src/main.tsx` | React entry point. Renders `<App />` into the DOM wrapped with providers (Theme, Auth, Settings, CustomerAuth). |
| `src/App.tsx` | Top-level routing using React Router. Defines all routes: storefront (`/`, `/category/:slug`), customer account (`/account`), trade (`/trade`), admin login (`/admin/login`), and admin dashboard with nested routes (`/admin/dashboard`, `/admin/products`, `/admin/orders`, `/admin/categories`, `/admin/trades`, `/admin/coupons`, `/admin/users`, `/admin/fraud-radar`, `/admin/settings`, `/admin/announcements`). Protected routes wrap admin paths with `<ProtectedRoute>`. |
| `src/App.css` | Minimal global app-level styles. |
| `src/index.css` | Tailwind CSS v4 imports (`@import "tailwindcss"`) and custom CSS variables for the dark theme. |
| `vite.config.ts` | Vite build configuration. Sets the React plugin and defines the build output directory (`dist/`). |
| `tsconfig.json` | Root TypeScript configuration referencing `tsconfig.app.json` and `tsconfig.node.json`. |
| `tsconfig.app.json` | TypeScript config for the application source code (strict mode, JSX react-jsx, path aliases). |
| `tsconfig.node.json` | TypeScript config for Vite/Node tooling files. |
| `package.json` | Frontend dependencies: React 18, React Router, Tailwind CSS v4, Lucide React (icons), Vite. |
| `postcss.config.mjs` | PostCSS configuration for Tailwind CSS processing. |
| `eslint.config.js` | ESLint configuration for code linting. |
| `.env.example` | Environment variable template. Contains `VITE_API_BASE_URL` pointing to the backend API. |
| `components.json` | Shadcn/ui configuration file for component library setup. |

### Context Providers (`frontend/src/context/`)

| File | Purpose |
|------|---------|
| `AuthContext.tsx` | **Admin authentication context**. Exposes `token`, `isAuthenticated`, `loading`, `login()`, `logout()`. Stores the admin Sanctum token in localStorage. |
| `CustomerAuthContext.tsx` | **Customer authentication context**. Exposes `user`, `token`, `isAuthenticated`, `loading`, `login()`, `register()`, `verifyEmail()`, `logout()`. Handles email verification flow and token persistence. |
| `SettingsContext.tsx` | Fetches and caches site settings from `/api/settings`. Provides `settings` object to all components (site name, logos, payment numbers, etc.). |
| `ThemeContext.tsx` | Dark/light theme toggle (currently defaults to dark mode). |

### Core Library (`frontend/src/lib/`)

| File | Purpose |
|------|---------|
| `api.ts` | **API client utility**. Exports `apiJson<T>(url, token?, options?)` — a typed fetch wrapper that automatically sets `Authorization: Bearer` headers when a token is provided, parses JSON, and throws on non-2xx responses. The backbone of all frontend-backend communication. |

### Data (`frontend/src/data/`)

| File | Purpose |
|------|---------|
| `categories.ts` | TypeScript interfaces for all data models: `Product`, `ProductGroup`, `Setting`, `Transaction`, `CustomerTransaction`, `Trade`, `Announcement`, `Coupon`, etc. Also exports the `NAV_ITEMS` array for the mega menu navigation and helper functions. |

### Layouts (`frontend/src/layouts/`)

| File | Purpose |
|------|---------|
| `StorefrontLayout.tsx` | Wraps all customer-facing pages with the `MarketplaceHeader` and a centered content area. |

### Components (`frontend/src/components/`)

| File | Purpose |
|------|---------|
| `header/MarketplaceHeader.tsx` | **Main navigation header**. Contains: logo, "Shop" label, icon buttons (search, notifications, account, trade) with tooltips on hover, and a yellow dot on the notification bell when unread announcements exist. Fetches announcements from `/api/announcements`. |
| `header/MegaMenu.tsx` | **Dropdown mega menu**. Activated by clicking "Shop." Shows a grid of category links with icons, a "Browse All" section, and product count labels. Styled with rounded borders, gradient header, and glass-morphism backdrop. |
| `CheckoutModal.tsx` | **Checkout/purchase flow**. Handles: product details display, bKash/Nagad payment gateway selection (2-column grid with logos and copy-to-clipboard), coupon code input with validation feedback (`/api/coupon/validate`), loyalty points redemption slider (capped at available points and remaining price), price breakdown (original → coupon discount → points discount → final), and submission to `/api/checkout` with the auth token. |
| `GroupCard.tsx` | **Category card** on the homepage. Shows category image with bottom gradient overlay + glassmorphism effect, product count badge, "Browse" button in purple. |
| `TradeModal.tsx` | **Trade request submission modal**. Simple form with description textarea. Submits to `/api/trade`. Available to both authenticated and guest users. |
| `ConfirmModal.tsx` | **Reusable confirmation dialog**. Takes `isOpen`, `onClose`, `onConfirm`, `title`, `message`, `confirmLabel`, `variant` ("danger" red or "primary" indigo), `loading`. Used for ban, unban, delete, and other destructive actions. |
| `ImageUploader.tsx` | **Drag-and-drop image upload** component. Handles file selection, preview, and upload via `POST /api/admin/images/upload`. Used in product and category edit modals. |
| `NotificationDropdown.tsx` | Dropdown panel attached to the notification bell icon. Lists recent announcements with type badges. |
| `ProtectedRoute.tsx` | Route guard that redirects to `/admin/login` if no valid admin token exists in context. |

### Pages — Storefront (`frontend/src/pages/`)

| File | Purpose |
|------|---------|
| `Home.tsx` | **Landing page**. Displays a hero section (gradient text, tagline), then a responsive grid of `GroupCard` components for all product categories fetched from `/api/categories`. |
| `CategoryPage.tsx` | **Product listing page** for a single category (by slug). Shows category header with image. Renders product cards in a list layout: product name + description (top-left), 80×80 image (right), original price with strikethrough + discount percentage in emerald, dynamic discount badges (rose <10%, amber 10-24%, purple ≥25%), "Buy Now" button opening the `CheckoutModal`. |

### Pages — Customer (`frontend/src/pages/customer/`)

| File | Purpose |
|------|---------|
| `AccountPage.tsx` | **My Account page**:<br>• **Unauthenticated**: Shows Sign In / Create Account tabs with email+password forms. Registration triggers a 6-digit verification code flow (6 separate input boxes, paste support, auto-focus advancing).<br>• **Authenticated**: Shows profile card (name, email, avatar), loyalty points balance card (amber, with ৳ equivalent), Purchase History table (product, price, points earned/redeemed, status badge, date), Trade Requests table (description, status badge with 4 colors for pending/reviewed/completed/declined, date), and a Sign Out button. |

### Pages — Admin (`frontend/src/pages/admin/`)

| File | Purpose |
|------|---------|
| `AdminLayout.tsx` | **Admin sidebar + shell**. Provides the left sidebar navigation with links to all admin pages. Uses icons from Lucide React. Shows the current admin user and logout button. |
| `LoginPage.tsx` | Admin login form (email + password). Authenticates via `POST /api/admin/login` and stores the token in `AuthContext`. |
| `DashboardPage.tsx` | **Admin dashboard overview**. Shows summary stats: total revenue, total orders, total users, total products. May include charts or recent activity. |
| `ProductsPage.tsx` | **Product CRUD**. Table of all products with columns: name, category, price, original price, discount %, type, SKU. Includes "Add Product" modal and "Edit Product" modal (with `ImageUploader`). Form validation enforces `original_price >= price`. |
| `OrdersPage.tsx` | **Order/transaction management**. Table with three tabs: All / Paid (completed) / Unpaid (pending+refunded). Each row shows transaction details, status badge, and quick-action buttons: ✓ (pending→completed), ↩ (completed→refunded), ↻ (refunded→pending), 🗑 delete with confirmation. Status changes trigger points logic (credit on complete, reverse on refund). |
| `CategoriesPage.tsx` | **Category management**. Table of product groups. "Edit" button opens a modal with `ImageUploader` for the category image and a classification tag selector. "Add Category" creates new groups. |
| `CouponsPage.tsx` | **Coupon performance tracker**. Full CRUD table with columns: code, type (percentage/fixed), value, usage bar (used_count / max_uses as progress bar), min purchase, expiry, active toggle. Multi-select for side-by-side comparison. CSV export button. |
| `TradesPage.tsx` | **Trade request management**. Table of all trade requests with status badges (pending/amber, reviewed/blue, completed/emerald, declined/rose). Admins can update status and delete trades. Sends `TradeStatusNotification` email on status change. |
| `UsersPage.tsx` | **User management panel**. Lists all registered users with their email, points balance, transaction count, and registration date. Admins can adjust a user's loyalty points (add/remove) and delete user accounts with confirmation. |
| `FraudRadarPage.tsx` | **Account Security & Fraud Radar**. The main fraud detection dashboard. Displays all users with sortable columns: User (name, email, last purchase date), Orders (transaction count), Trades (trade count + 1h/24h velocity dots), Velocity (color-coded flags: 🔴 high, 🟠 medium with 1h/24h velocity dots), 24h Spend (৳ with color thresholds: emerald <50k, amber 50-100k, rose ≥100k), Status (ACTIVE/BANNED badge), Actions (Ban/Unban/Delete buttons with `ConfirmModal`). Flags include: hourly purchase volume ≥3 → high, daily purchase volume ≥20 → high, daily spend ≥100k → high, trade hourly volume ≥3 → high, trade daily volume ≥10 → high. |
| `AnnouncementsPage.tsx` | **Announcement management**. CRUD for site announcements that appear in the customer notification bell. |
| `SettingsPage.tsx` | **Site settings editor**. Key-value editor for all settings (site name, payment numbers, logos, etc.). |

---

## Deployment (`deploy.py`)

Python script that deploys both frontend and backend to a Hostinger shared hosting server via SFTP (port 65002):

- **Frontend**: Clears old files from `public_html/`, uploads all files from `frontend/dist/` (the Vite build output), updates `.htaccess`
- **Backend**: Uploads a whitelisted set of PHP files (controllers, models, routes, migrations, seeders, mail templates, config), runs `php artisan migrate --force`, caches routes with `php artisan route:cache`
- Ensures the Laravel `index.php` entrypoint and `storage` symlink exist

---

## Key Design Decisions

1. **Points lifecycle**: Loyalty points are **strictly tied to order completion**. They are stored on the transaction at checkout but only credited to the user when an admin marks the order "completed." On refund, both earned and redeemed points are reversed.

2. **Velocity fraud detection**: The Fraud Radar computes per-user velocity in two dimensions — purchases (count + spend) and trade requests — over 1-hour and 24-hour windows. Flag thresholds are hardcoded in `AdminController::listUsers()`.

3. **Atomic coupon usage**: Coupon `used_count` is incremented inside a database transaction with a `WHERE used_count < max_uses` guard, preventing race conditions where two simultaneous checkouts could exceed the usage limit.

4. **Trade ↔ User linkage**: Trades are linked to users by **email matching** (not `user_id`), since trades can be submitted before account creation. This allows retroactive association when a user registers.

5. **Mandatory auth for checkout**: All purchases require a logged-in customer. Banned users receive a 403 and cannot complete checkout.

6. **Case-insensitive coupons**: Coupon codes are stored and matched in uppercase (`strtoupper()`), making them case-insensitive for customers.

---

## Local Development

### Backend
```bash
cd backend
composer install
cp .env.example .env
# Edit .env with your database credentials
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env: VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

---

## Production Deployment

```bash
# Build frontend
cd frontend && npm run build

# Deploy everything to Hostinger
cd .. && python deploy.py
```

The deploy script connects via SFTP (port 65002) using credentials stored in `deploy.py`. It uploads the frontend `dist/` files to `public_html/` and backend PHP files to the Laravel application directory, then runs migrations and caches routes.
