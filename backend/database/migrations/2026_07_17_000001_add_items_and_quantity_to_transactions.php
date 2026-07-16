<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->json('items')->nullable()->after('price');
            $table->integer('quantity')->default(1)->after('items');
        });

        // Backfill existing single-product rows so every record has items populated
        DB::statement("
            UPDATE transactions
            SET items = JSON_ARRAY(JSON_OBJECT(
                'product_id', COALESCE(product_id, 0),
                'product_name', product_name,
                'price', CAST(price AS DECIMAL(10,2)),
                'quantity', 1,
                'subtotal', CAST(price AS DECIMAL(10,2))
            )),
            quantity = 1
            WHERE items IS NULL
        ");
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['quantity', 'items']);
        });
    }
};
