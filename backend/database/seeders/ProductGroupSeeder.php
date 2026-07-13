<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductGroupSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Insert Groups and capture their IDs
        $minecraftId = DB::table('product_groups')->insertGetId([
            'name' => 'Minecraft',
            'slug' => 'minecraft',
            'image_url' => 'https://placehold.co/600x400/1e293b/ffffff?text=Minecraft',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $steamId = DB::table('product_groups')->insertGetId([
            'name' => 'Steam',
            'slug' => 'steam',
            'image_url' => 'https://placehold.co/600x400/1e293b/ffffff?text=Steam',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        // 2. Insert Products linked to those specific Group IDs
        DB::table('products')->insert([
        ['product_group_id' => $minecraftId, 'name' => 'Minecraft Java & Bedrock', 'price' => 2500.00, 'type' => 'accounts', 'created_at' => now(), 'updated_at' => now()],
        ['product_group_id' => $minecraftId, 'name' => 'Minecoins 1000 Pack', 'price' => 950.00, 'type' => 'currency', 'created_at' => now(), 'updated_at' => now()],
    
        ['product_group_id' => $steamId, 'name' => 'Steam $5 Wallet Card', 'price' => 600.00, 'type' => 'gift-cards', 'created_at' => now(), 'updated_at' => now()],
        ['product_group_id' => $steamId, 'name' => 'Steam $10 Wallet Card', 'price' => 1150.00, 'type' => 'gift-cards', 'created_at' => now(), 'updated_at' => now()],
]);
    }
}