<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Make products.original_price fully optional (nullable).
 *
 * Background: the `original_price` column was originally added to the live
 * database WITHOUT a corresponding migration ever being committed to the repo
 * (only the later `add_discount_percentage` migration references it via
 * `->after('original_price')`). Because that out-of-band column was created as
 * NOT NULL, saving a product with no discount — i.e. `original_price = null` —
 * raised a MySQL "Column 'original_price' cannot be null" constraint violation
 * and product creation silently failed.
 *
 * This migration idempotently guarantees the column exists AND is nullable:
 *   - On databases that already have the column (production): ALTER it to
 *     nullable (preserving DECIMAL(10,2)) so nulls are accepted.
 *   - On fresh databases that never had it: CREATE it as nullable up front.
 *
 * Laravel 11+ supports native column modification via ->change() on MySQL
 * without requiring doctrine/dbal, so the ALTER path here needs no extra deps.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'original_price')) {
                $table->decimal('original_price', 10, 2)
                    ->nullable()
                    ->after('price')
                    ->comment('Pre-discount RRP for the strikethrough price; null when no discount');
            } else {
                $table->decimal('original_price', 10, 2)
                    ->nullable()
                    ->change();
            }
        });
    }

    public function down(): void
    {
        // Intentionally a no-op: re-imposing NOT NULL would fail on rows whose
        // original_price is legitimately NULL (the whole point of this change),
        // and dropping the column outright would discard data that other code
        // references. We leave the column nullable.
    }
};
