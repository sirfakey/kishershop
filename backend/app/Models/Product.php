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
        'description',
        'price',
        'original_price',
        'discount_percentage',
        'product_group_id',
        'type',
        'custom_form_code',
        'custom_checkout_fields',
        'enable_seller_notes',
        'custom_checkout_html',
        'sku',
        'image_url',
    ];

    protected $casts = [
        'price'                  => 'decimal:2',
        'original_price'         => 'decimal:2',
        'discount_percentage'    => 'integer',
        'is_available'           => 'boolean',
        'enable_seller_notes'    => 'boolean',
        'custom_checkout_fields' => 'array',
    ];

    /**
     * Derive a 2-3 character SKU prefix from a category name when no explicit
     * sku_prefix has been configured for the product group.
     *
     * Multi-word names use initials of the first two words (e.g. "Mobile Cards" → "MC").
     * Single-word names use the first 2-3 letters (e.g. "Games" → "GAM").
     */
    private static function deriveGroupPrefix(?string $name): string
    {
        if (empty($name)) {
            return 'XX';
        }

        $words = preg_split('/\s+/', trim($name));

        if (count($words) >= 2) {
            // Initials of first two words
            $prefix = strtoupper(substr($words[0], 0, 1) . substr($words[1], 0, 1));
        } else {
            // First 2-3 chars of single word
            $prefix = strtoupper(substr($name, 0, strlen($name) <= 3 ? 3 : 2));
        }

        return $prefix ?: 'XX';
    }

    protected static function booted(): void
    {
        static::created(function (Product $product) {
            // Only generate if sku wasn't manually set during creation
            if (!empty($product->sku)) return;

            $typePrefix = ProductType::where('type', $product->type)->value('sku_prefix') ?? 'XX';

            // Use explicit sku_prefix if set, otherwise derive from group name
            $groupPrefix = $product->productGroup?->sku_prefix
                ?? static::deriveGroupPrefix($product->productGroup?->name);

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