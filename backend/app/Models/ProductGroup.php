<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductGroup extends Model
    {
    // Explicitly define the table name in case Laravel is guessing wrong
    protected $table = 'product_groups';

    // Mass assignment protection bypass so create() works for new categories
    protected $guarded = [];

    protected $fillable = ['name', 'classification', 'slug', 'image_url', 'sku_prefix'];

    /**
     * Get the products associated with this category group.
     */
    public function products(): HasMany
    {
        // We explicitly tell Laravel that the foreign key on the products table is 'product_group_id'
        return $this->hasMany(Product::class, 'product_group_id', 'id');
    }
    }