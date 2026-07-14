<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    /** Settings are keyed by `key`, not an auto-increment id. */
    protected $primaryKey = 'key';

    /** The key column is a string and is not incrementing. */
    public $incrementing = false;
    protected $keyType = 'string';

    /** Mass assignment — matches the ProductGroup convention ($guarded = []). */
    protected $guarded = [];

    /** `value` may hold arbitrary-length text (e.g. long URLs/JSON blobs). */
    protected $casts = [
        'value' => 'string',
    ];

    /**
     * Keys that are safe to expose to the public frontend.
     */
    public const PUBLIC_KEYS = [
        'site_name',
        'logo_url',
    ];

    /**
     * Read a setting value, falling back to a default when missing.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::find($key);

        return $setting && $setting->value !== null ? $setting->value : $default;
    }

    /**
     * Create or update a setting value.
     */
    public static function set(string $key, mixed $value): void
    {
        static::updateOrCreate(
            ['key' => $key],
            ['value' => $value === '' ? null : $value],
        );
    }

    /**
     * Return only the public-facing settings as a plain associative array.
     */
    public static function public(): array
    {
        $rows = static::whereIn('key', self::PUBLIC_KEYS)->pluck('value', 'key');

        return [
            'site_name' => $rows->get('site_name', 'Kisher.Shop'),
            'logo_url'  => $rows->get('logo_url'),
        ];
    }
}
