<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->json('custom_checkout_fields')->nullable()->after('custom_form_code');
            $table->boolean('enable_seller_notes')->default(false)->after('custom_checkout_fields');
            $table->text('custom_checkout_html')->nullable()->after('enable_seller_notes');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['custom_checkout_fields', 'enable_seller_notes', 'custom_checkout_html']);
        });
    }
};
