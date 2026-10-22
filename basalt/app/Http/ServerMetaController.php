<?php

declare(strict_types=1);

namespace Basalt\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Pterodactyl\Facades\Extensions;

/**
 * What the dashboard draws around a server beyond the client API: its egg's card artwork and
 * its location, with the flag an administrator set for it.
 */
final class ServerMetaController
{
    public function __invoke(Request $request): JsonResponse
    {
        $settings = Extensions::settings('basalt');
        $servers = AccessibleServers::fromRequest($request)->load(['egg.tags', 'node.location']);

        $meta = [];
        foreach ($servers as $server) {
            $location = $server->node?->location;
            $meta[$server->uuid] = [
                'egg' => $server->egg?->name,
                'banner' => $server->egg ? self::url($settings->fields($server->egg)->get('banner')) : null,
                'location' => $location ? ($location->long ?: $location->short) : null,
                'flag' => $location ? self::flag($settings->fields($location)->get('flag')) : null,
                'minecraft' => $server->hasTag('minecraft'),
            ];
        }

        return new JsonResponse(['servers' => (object) $meta]);
    }

    private static function url(mixed $value): ?string
    {
        return is_string($value) && preg_match('#^(https?://|/(?!/))#i', $value) ? $value : null;
    }

    private static function flag(mixed $value): ?string
    {
        return is_string($value) && preg_match('/^[a-zA-Z]{2}$/', $value) ? strtolower($value) : null;
    }
}
