<?php

declare(strict_types=1);

namespace Basalt\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Pterodactyl\Facades\Extensions;
use Pterodactyl\Models\Server;

/**
 * The signed-in user's note on a server, for the dashboard's Notes block. Each user sees only
 * their own; the notes are kept with their preferences, the most recently written last.
 */
final class NotesController
{
    private const int MAX_NOTES = 500;

    public function update(Request $request, string $uuid): JsonResponse
    {
        $data = $request->validate(['text' => ['present', 'nullable', 'string', 'max:5000']]);
        abort_unless(Str::isUuid($uuid), 404);

        $user = $request->user();
        $server = Server::query()->where('uuid', $uuid)->first();
        abort_if($server === null || (! $user->root_admin && ! $user->accessibleServers()->where('servers.id', $server->id)->exists()), 404);

        $settings = Extensions::settings('basalt')->forUser($user);
        $notes = array_filter((array) $settings->get('notes', []), is_string(...));
        unset($notes[$uuid]);
        $text = (string) ($data['text'] ?? '');
        if ($text !== '') {
            $notes[$uuid] = $text;
            $notes = array_slice($notes, -self::MAX_NOTES, null, true);
        }
        $settings->set('notes', $notes);

        return new JsonResponse(['notes' => (object) $notes]);
    }
}
