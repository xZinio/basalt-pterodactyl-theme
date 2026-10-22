<?php

declare(strict_types=1);

namespace Basalt\Http;

use Basalt\MinecraftStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Contracts\Servers\ReadsServerState;
use Throwable;

/**
 * Players online on running Minecraft servers, from each server's status ping. Readings are
 * cached for thirty seconds, so the dashboard's polling never floods a game server.
 */
final class PlayersController
{
    private const int TTL = 30;

    public function __invoke(Request $request, ReadsServerState $states): JsonResponse
    {
        $players = [];
        foreach (AccessibleServers::fromRequest($request, 24)->load(['allocation', 'node', 'egg.tags']) as $server) {
            if (! $server->hasTag('minecraft')) {
                continue;
            }

            // Wrapped, so an unreachable server is remembered as such instead of being retried at once.
            $players[$server->uuid] = Cache::remember("basalt:players:{$server->uuid}", self::TTL, function () use ($server, $states): array {
                try {
                    if ($states->read($server)->state !== 'running' || $server->allocation === null) {
                        return ['value' => null];
                    }
                } catch (Throwable) {
                    return ['value' => null];
                }

                $allocation = $server->allocation;
                $host = in_array($allocation->ip, ['0.0.0.0', '::'], true) ? $server->node->fqdn : $allocation->ip;

                return ['value' => MinecraftStatus::query($host, $allocation->port)];
            })['value'];
        }

        return new JsonResponse(['servers' => (object) $players]);
    }
}
