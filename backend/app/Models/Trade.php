<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Trade extends Model
{
    protected $fillable = [
        'email',
        'whatsapp_number',
        'description',
        'status',
    ];
}
