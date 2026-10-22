<?php

declare(strict_types=1);

namespace Basalt\Http;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Pterodactyl\Models\Server;

/** The servers named by a request's `uuids[]` that the signed-in user may see. */
final class AccessibleServers
{
    /** @return Collection<int, Server> */
    public static function fromRequest(Request $request, int $limit = 100): Collection
    {
        $uuids = array_values(array_unique(array_filter(
            (array) $request->query('uuids', []),
            fn (mixed $uuid): bool => is_string($uuid) && Str::isUuid($uuid),
        )));
        $uuids = array_slice($uuids, 0, $limit);
        if ($uuids === []) {
            return new Collection;
        }

        $user = $request->user();
        $query = Server::query()->whereIn('servers.uuid', $uuids);
        // Root admins can list every server on the dashboard; everyone else sees their own and those they help run.
        if (! $user->root_admin) {
            $query->whereIn('servers.id', $user->accessibleServers()->pluck('servers.id'));
        }

        return $query->get();
    }
}
