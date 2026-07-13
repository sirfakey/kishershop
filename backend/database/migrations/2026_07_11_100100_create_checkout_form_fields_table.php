<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checkout_form_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checkout_form_id')->constrained('checkout_forms')->onDelete('cascade');
            $table->string('field_name');
            $table->string('field_label');
            $table->enum('field_type', ['text', 'number', 'select', 'textarea', 'checkbox']);
            $table->boolean('is_required')->default(false);
            $table->json('options')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checkout_form_fields');
    }
};