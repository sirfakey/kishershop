<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{  
    Schema::create('transactions', function (Blueprint $table) {
        $table->id();
        $table->string('transaction_id')->unique(); // For tracking bKash/Nagad hashes
        $table->string('product_name');
        $table->decimal('price', 10, 2);
        $table->string('customer_email')->nullable();
        $table->string('account_credentials')->nullable(); // For automated fulfillment scripts
        $table->string('status')->default('completed');
        $table->timestamps(); // Automatically handles purchase time tracking via created_at
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
