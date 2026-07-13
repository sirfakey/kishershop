<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        // 1. Drop the FK from products → checkout_forms, then drop the column
        if (Schema::hasColumn('products', 'checkout_form_id')) {
            Schema::table('products', function (Blueprint $table) {
                // Laravel FK convention: {table}_{column}_foreign
                try {
                    $table->dropForeign(['checkout_form_id']);
                } catch (\Throwable) {
                    // FK may not exist or may have a non-standard name — continue
                }
                $table->dropColumn('checkout_form_id');
            });
        }

        // 2. Add custom_form_code TEXT column to products
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'custom_form_code')) {
                $table->text('custom_form_code')->nullable()->after('type');
            }
        });

        // 3. Drop the old checkout form tables
        Schema::dropIfExists('checkout_form_fields');
        Schema::dropIfExists('checkout_forms');

        // 4. Widen account_credentials on transactions from string/VARCHAR to TEXT
        //    so it can hold full JSON blobs of submitted field values.
        Schema::table('transactions', function (Blueprint $table) {
            $table->text('account_credentials')->nullable()->change();
        });
    }

    public function down(): void
    {
        // 1. Revert account_credentials back to string
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('account_credentials')->nullable()->change();
        });

        // 2. Recreate checkout_forms table
        Schema::create('checkout_forms', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // 3. Recreate checkout_form_fields table
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

        // 4. Restore checkout_form_id on products
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'checkout_form_id')) {
                $table->foreignId('checkout_form_id')
                    ->nullable()
                    ->constrained('checkout_forms')
                    ->nullOnDelete();
            }
        });

        // 5. Drop custom_form_code from products
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'custom_form_code')) {
                $table->dropColumn('custom_form_code');
            }
        });
    }
};