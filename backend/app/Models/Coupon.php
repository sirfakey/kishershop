<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    protected $fillable = [
        'code',
        'discount_type',
        'discount_value',
        'min_purchase',
        'max_uses',
        'used_count',
        'expires_at',
        'is_active',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'min_purchase'   => 'decimal:2',
        'max_uses'       => 'integer',
        'used_count'     => 'integer',
        'is_active'      => 'boolean',
        'expires_at'     => 'datetime',
    ];

    /**
     * Check if this coupon is valid for a given cart/product price.
     */
    public function isValidFor(float $productPrice): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if ($this->max_uses !== null && $this->used_count >= $this->max_uses) {
            return false;
        }

        if ($this->expires_at !== null && now()->gt($this->expires_at)) {
            return false;
        }

        if ($productPrice < (float) $this->min_purchase) {
            return false;
        }

        return true;
    }

    /**
     * Calculate the discount amount for a given price.
     */
    public function calculateDiscount(float $price): float
    {
        if ($this->discount_type === 'percentage') {
            return round($price * ((float) $this->discount_value / 100), 2);
        }

        // Fixed discount — capped at the product price
        return min((float) $this->discount_value, $price);
    }
}
