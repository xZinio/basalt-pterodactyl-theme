<?php

declare(strict_types=1);

namespace Basalt\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Pterodactyl\Facades\Extensions;
use Pterodactyl\Models\User;

/**
 * The signed-in user's dashboard preferences: server folders, favourites, the order of their
 * server cards and their own accent colour. Stored as the theme's settings for that user.
 */
final class PreferencesController
{
    private const array KEYS = ['folders', 'favorites', 'order', 'accent'];

    public function show(Request $request): JsonResponse
    {
        return new JsonResponse($this->read($request->user()));
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'folders' => ['sometimes', 'array', 'max:30'],
            'folders.*' => ['array:id,name,icon,servers'],
            'folders.*.id' => ['required', 'string', 'max:40', 'regex:/^[A-Za-z0-9_-]+$/'],
            'folders.*.name' => ['required', 'string', 'max:40'],
            'folders.*.icon' => ['nullable', 'string', 'max:40', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'folders.*.servers' => ['present', 'array', 'max:250'],
            'folders.*.servers.*' => ['string', 'uuid'],
            'favorites' => ['sometimes', 'array', 'max:500'],
            'favorites.*' => ['string', 'uuid'],
            'order' => ['sometimes', 'array', 'max:1000'],
            'order.*' => ['string', 'uuid'],
            'accent' => ['sometimes', 'nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ]);

        $values = array_intersect_key($data, array_flip(self::KEYS));
        if (isset($values['folders'])) {
            // Keep only the declared fields, with list values, whatever order the client sent them in.
            $values['folders'] = array_values(array_map(fn (array $folder): array => [
                'id' => $folder['id'],
                'name' => $folder['name'],
                'icon' => $folder['icon'] ?? null,
                'servers' => array_values(array_unique($folder['servers'])),
            ], $values['folders']));
        }
        foreach (['favorites', 'order'] as $list) {
            if (isset($values[$list])) {
                $values[$list] = array_values(array_unique($values[$list]));
            }
        }

        Extensions::settings('basalt')->forUser($request->user())->setMany($values);

        return new JsonResponse($this->read($request->user()));
    }

    /** @return array<string, mixed> */
    private function read(User $user): array
    {
        $settings = Extensions::settings('basalt')->forUser($user);

        return [
            'folders' => $settings->get('folders', []),
            'favorites' => $settings->get('favorites', []),
            'order' => $settings->get('order', []),
            'accent' => $settings->get('accent'),
        ];
    }
}
