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
        'coupon_code',
        'coupon_id',
        'coupon_discount',
        'status',
        'points_earned',
        'points_redeemed',
        'gateway',
    ];

    protected $casts = [
        'custom_fields'   => 'array',
        'price'           => 'decimal:2',
        'coupon_discount' => 'decimal:2',
        'coupon_id'       => 'integer',
        'points_earned'   => 'integer',
        'points_redeemed'  => 'integer',
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