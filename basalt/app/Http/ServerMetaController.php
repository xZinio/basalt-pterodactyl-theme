<?php

declare(strict_types=1);

namespace Basalt\Http;

use Basalt\Content;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Pterodactyl\Facades\Extensions;

/**
 * What the dashboard draws around a server beyond the client API: its egg's card artwork, its
 * location with the country and label an administrator set for it, whether it counts players,
 * and the node and egg announcements can be aimed at.
 */
final class ServerMetaController
{
    public function __invoke(Request $request, Content $content): JsonResponse
    {
        $settings = Extensions::settings('basalt');
        $servers = AccessibleServers::fromRequest($request)->load(['egg', 'node.location']);
        $players = $content->playerEggs();

        $meta = [];
        foreach ($servers as $server) {
            $location = $server->node?->location;
            $label = $location ? $settings->fields($location)->get('label') : null;
            $meta[$server->uuid] = [
                'egg' => $server->egg?->name,
                'eggId' => (int) $server->egg_id,
                'nodeId' => (int) $server->node_id,
                'banner' => $server->egg ? self::url($settings->fields($server->egg)->get('banner')) : null,
                'location' => $location ? ($location->long ?: $location->short) : null,
                'locationLabel' => is_string($label) && $label !== '' ? $label : null,
                'flag' => $location ? self::flag($settings->fields($location)->get('flag')) : null,
                'minecraft' => in_array((int) $server->egg_id, $players, true),
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
