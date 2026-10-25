<?php

declare(strict_types=1);

namespace Basalt\Http;

use Basalt\Content;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Pterodactyl\Facades\Extensions;
use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Location;
use Pterodactyl\Models\Node;
use Pterodactyl\Services\Extensions\ExtensionSettingFiles;

/**
 * The studio's content: announcements, links, quick actions, the player count, locations and egg
 * images, with the eggs, nodes and locations they can name.
 */
final class ContentController
{
    /** The largest egg image, in kilobytes. */
    private const int IMAGE_KILOBYTES = 4096;

    public function __construct(private readonly Content $content)
    {
    }

    public function show(): JsonResponse
    {
        return new JsonResponse($this->state());
    }

    public function update(Request $request, string $key): JsonResponse
    {
        abort_unless(in_array($key, Content::KEYS, true), 404);
        $value = $request->validate(Content::rules($key))['value'];

        if ($key === 'locations') {
            $locations = Location::query()->whereIn('id', array_map('intval', array_keys($value['items'])))->get()->keyBy('id');
            foreach ($locations as $id => $location) {
                $item = $value['items'][$id];
                $country = $item['country'] ? strtolower($item['country']) : null;
                Extensions::settings('basalt')->fields($location)->setMany([
                    'flag' => $country,
                    'label' => $country !== null && is_string($item['label']) && trim($item['label']) !== '' ? trim($item['label']) : null,
                ]);
            }
            $value = ['dashboard' => $value['dashboard']];
        }

        $this->content->set($key, $value);

        return new JsonResponse($this->state());
    }

    /** Stores an image for an egg's servers, in place of the one it had. */
    public function storeImage(Request $request, string $egg, ExtensionSettingFiles $files): JsonResponse
    {
        $model = Egg::query()->findOrFail((int) $egg);
        $request->validate(['file' => ['required', 'file']]);
        $name = $files->store('basalt', $request->file('file'), ['image/png', 'image/jpeg', 'image/webp', 'image/gif'], self::IMAGE_KILOBYTES);
        $this->replaceImage($model, ExtensionSettingFiles::url('basalt', $name), $files);

        return new JsonResponse($this->state());
    }

    public function destroyImage(string $egg, ExtensionSettingFiles $files): JsonResponse
    {
        $this->replaceImage(Egg::query()->findOrFail((int) $egg), null, $files);

        return new JsonResponse($this->state());
    }

    /** Sets an egg's image, removing the file of the one before it when Basalt stored that file. */
    private function replaceImage(Egg $egg, ?string $url, ExtensionSettingFiles $files): void
    {
        $fields = Extensions::settings('basalt')->fields($egg);
        $previous = $fields->get('banner');
        $fields->set('banner', $url);

        $prefix = ExtensionSettingFiles::url('basalt', '');
        if (is_string($previous) && str_starts_with($previous, $prefix)) {
            $files->delete('basalt', substr($previous, strlen($prefix)));
        }
    }

    /** @return array<string, mixed> */
    private function state(): array
    {
        $settings = Extensions::settings('basalt');
        $eggs = Egg::query()->orderBy('name')->get(['id', 'name']);
        $locations = Location::query()->orderBy('short')->get(['id', 'short', 'long']);

        return [
            'content' => array_combine(Content::KEYS, array_map(fn (string $key): mixed => $this->content->get($key), Content::KEYS)),
            'eggs' => $eggs->map(fn (Egg $egg): array => [
                'id' => $egg->id,
                'name' => $egg->name,
                'image' => self::url($settings->fields($egg)->get('banner')),
            ])->values(),
            'nodes' => Node::query()->orderBy('name')->get(['id', 'name', 'location_id'])->map(fn (Node $node): array => [
                'id' => $node->id,
                'name' => $node->name,
                'location' => (int) $node->location_id,
            ])->values(),
            'locations' => $locations->map(function (Location $location) use ($settings): array {
                $fields = $settings->fields($location);

                return [
                    'id' => $location->id,
                    'short' => $location->short,
                    'long' => $location->long,
                    'country' => is_string($country = $fields->get('flag')) && preg_match('/^[a-zA-Z]{2}$/', $country) ? strtolower($country) : null,
                    'label' => is_string($label = $fields->get('label')) ? $label : null,
                ];
            })->values(),
        ];
    }

    private static function url(mixed $value): ?string
    {
        return is_string($value) && preg_match('#^(https?://|/(?!/))#i', $value) ? $value : null;
    }
}
