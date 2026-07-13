<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Product extends Model
{
    protected $table = 'products';

    protected $guarded = [];

    protected $fillable = [
        'name',
        'price',
        'original_price',
        'product_group_id',
        'type',
        'custom_form_code',
        'sku',
        'image_url',
    ];

    /**
     * Boot — auto-generate SKU on creation.
     */
    protected static function booted(): void
    {
        static::created(function (Product $product) {
            // Only generate if sku wasn't manually set during creation
            if (!empty($product->sku)) return;

            $groupPrefix = $product->productGroup?->sku_prefix ?? 'XX';
            $typePrefix = ProductType::where('type', $product->type)->value('sku_prefix') ?? 'XX';
            $paddedId = str_pad((string) $product->id, 3, '0', STR_PAD_LEFT);

            $sku = Str::upper("{$groupPrefix}-{$typePrefix}-{$paddedId}");

            // Update without triggering events to avoid recursion
            $product->sku = $sku;
            $product->saveQuietly();
        });
    }

    /**
     * Get the group category that owns this specific product item.
     */
    public function productGroup(): BelongsTo
    {
        return $this->belongsTo(ProductGroup::class, 'product_group_id', 'id');
    }
}