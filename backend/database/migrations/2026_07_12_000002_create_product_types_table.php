<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_types', function (Blueprint $table) {
            $table->id();
            $table->string('type')->unique();
            $table->string('sku_prefix')->nullable();
            $table->timestamps();
        });

        // Seed the five existing product type identifiers
        DB::table('product_types')->insert([
            ['type' => 'gift-cards', 'sku_prefix' => 'GC',   'created_at' => now(), 'updated_at' => now()],
            ['type' => 'accounts',  'sku_prefix' => 'ACC',  'created_at' => now(), 'updated_at' => now()],
            ['type' => 'currency',  'sku_prefix' => 'CUR',  'created_at' => now(), 'updated_at' => now()],
            ['type' => 'items',     'sku_prefix' => 'ITM',  'created_at' => now(), 'updated_at' => now()],
            ['type' => 'boosting',  'sku_prefix' => 'BST',  'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('product_types');
    }
};