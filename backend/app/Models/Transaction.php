<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'transaction_id',
        'product_name',
        'product_id',
        'price',
        'customer_email',
        'account_credentials',
        'custom_fields',
        'status',
    ];

    protected $casts = [
        'custom_fields' => 'array',
        'price'         => 'decimal:2',
    ];

    /**
     * The product associated with this transaction.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id', 'id');
    }

    /**
     * The customer who made this purchase (nullable — guest checkouts have no user).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}