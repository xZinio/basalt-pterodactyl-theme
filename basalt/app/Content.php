<?php

declare(strict_types=1);

namespace Basalt;

use Carbon\CarbonImmutable;
use Pterodactyl\Facades\Extensions;
use Pterodactyl\Models\Egg;
use Pterodactyl\Services\Extensions\ExtensionSettings;

/**
 * What administrators write for the panel beyond the theme settings: announcements, the sidebar's
 * links, the quick actions on server cards, where the player count shows and for which eggs, and
 * whether the server dashboard shows locations. Stored with Basalt's settings, each list saved
 * whole; the countries and labels of locations and the images of eggs are fields of those models.
 */
final class Content
{
    public const array KEYS = ['announcements', 'links', 'quickActions', 'players', 'locations'];

    /** The most entries each list holds. */
    public const array LIMITS = ['announcements' => 50, 'links' => 30, 'quickActions' => 4];

    /** What a quick action opens: a server page, a link, or the billing system's upgrade page. */
    public const array ACTIONS = ['console', 'files', 'backups', 'databases', 'schedules', 'network', 'startup', 'settings', 'url', 'upgrade'];

    /** A path on the panel or an http(s) address, which may hold {id}, {uuid}, {name}, {ip} and {port}. */
    private const string URL = '#^(https?://[^\s]+|/(?!/)[^\s]*)$#i';

    private const string ID = '/^[A-Za-z0-9_-]{1,40}$/';

    private const string ICON = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/';

    private ExtensionSettings $settings;

    public function __construct()
    {
        $this->settings = Extensions::settings('basalt');
    }

    /** The validation rules for a key's value. @return array<string, list<mixed>> */
    public static function rules(string $key): array
    {
        $id = ['required', 'string', 'regex:'.self::ID];
        $url = ['string', 'max:500', 'regex:'.self::URL];
        $icon = ['nullable', 'string', 'max:40', 'regex:'.self::ICON];

        return match ($key) {
            'announcements' => [
                'value' => ['present', 'array', 'list', 'max:'.self::LIMITS['announcements']],
                'value.*' => ['array:id,enabled,title,body,type,style,placement,nodes,eggs,startsAt,endsAt,dismissible,buttonLabel,buttonUrl'],
                'value.*.id' => $id,
                'value.*.enabled' => ['required', 'boolean'],
                'value.*.title' => ['present', 'nullable', 'string', 'max:120'],
                'value.*.body' => ['present', 'nullable', 'string', 'max:2000'],
                'value.*.type' => ['required', 'in:info,success,warning,danger'],
                'value.*.style' => ['required', 'in:banner,card,minimal'],
                'value.*.placement' => ['required', 'in:everywhere,dashboard,server'],
                'value.*.nodes' => ['present', 'array', 'max:200'],
                'value.*.nodes.*' => ['integer', 'min:1'],
                'value.*.eggs' => ['present', 'array', 'max:500'],
                'value.*.eggs.*' => ['integer', 'min:1'],
                'value.*.startsAt' => ['present', 'nullable', 'date'],
                'value.*.endsAt' => ['present', 'nullable', 'date'],
                'value.*.dismissible' => ['required', 'boolean'],
                'value.*.buttonLabel' => ['present', 'nullable', 'string', 'max:40'],
                'value.*.buttonUrl' => ['present', 'nullable', ...$url],
            ],
            'links' => [
                'value' => ['present', 'array', 'list', 'max:'.self::LIMITS['links']],
                'value.*' => ['array:id,label,url,icon,area,newTab'],
                'value.*.id' => $id,
                'value.*.label' => ['required', 'string', 'max:40'],
                'value.*.url' => ['required', ...$url],
                'value.*.icon' => $icon,
                'value.*.area' => ['required', 'in:everywhere,dashboard,account,server'],
                'value.*.newTab' => ['required', 'boolean'],
            ],
            'quickActions' => [
                'value' => ['present', 'array', 'list', 'max:'.self::LIMITS['quickActions']],
                'value.*' => ['array:id,action,label,icon,url'],
                'value.*.id' => $id,
                'value.*.action' => ['required', 'in:'.implode(',', self::ACTIONS)],
                'value.*.label' => ['required', 'string', 'max:30'],
                'value.*.icon' => $icon,
                'value.*.url' => ['present', 'nullable', 'required_if:value.*.action,url', ...$url],
            ],
            'players' => [
                'value' => ['required', 'array:cards,dashboard,eggs'],
                'value.cards' => ['required', 'boolean'],
                'value.dashboard' => ['required', 'boolean'],
                'value.eggs' => ['present', 'array', 'max:500'],
                'value.eggs.*' => ['integer', 'min:1'],
            ],
            'locations' => [
                'value' => ['required', 'array:dashboard,items'],
                'value.dashboard' => ['required', 'boolean'],
                'value.items' => ['present', 'array'],
                'value.items.*' => ['array:country,label'],
                'value.items.*.country' => ['present', 'nullable', 'string', 'regex:/^[a-zA-Z]{2}$/'],
                'value.items.*.label' => ['present', 'nullable', 'string', 'max:40'],
            ],
            default => [],
        };
    }

    /** A key's saved value, or its default while it has never been saved. */
    public function get(string $key): mixed
    {
        return $this->settings->get('content.'.$key) ?? $this->default($key);
    }

    /** @param array<mixed> $value a value that passed the key's rules */
    public function set(string $key, array $value): void
    {
        if ($key === 'players') {
            $value['eggs'] = array_values(array_unique(array_map('intval', $value['eggs'])));
        }

        $this->settings->set('content.'.$key, $value);
    }

    /**
     * What every user's pages need: the announcements showing now, the links and quick actions,
     * and where the player count and locations show.
     *
     * @return array<string, mixed>
     */
    public function forUsers(): array
    {
        $now = CarbonImmutable::now();
        $showing = static function (array $announcement) use ($now): bool {
            $starts = $announcement['startsAt'] ?? null;
            $ends = $announcement['endsAt'] ?? null;

            return ($announcement['enabled'] ?? false) === true
                && ($starts === null || CarbonImmutable::parse($starts)->lessThanOrEqualTo($now))
                && ($ends === null || CarbonImmutable::parse($ends)->greaterThan($now));
        };
        $players = (array) $this->get('players');

        return [
            'announcements' => array_values(array_map(
                static fn (array $announcement): array => array_diff_key($announcement, array_flip(['enabled', 'startsAt', 'endsAt'])),
                array_filter((array) $this->get('announcements'), $showing),
            )),
            'links' => array_values((array) $this->get('links')),
            'quickActions' => array_values((array) $this->get('quickActions')),
            'players' => ['cards' => (bool) ($players['cards'] ?? true), 'dashboard' => (bool) ($players['dashboard'] ?? true)],
            'locations' => ['dashboard' => (bool) (((array) $this->get('locations'))['dashboard'] ?? true)],
        ];
    }

    /** The eggs whose servers count players. @return list<int> */
    public function playerEggs(): array
    {
        return array_values(array_map('intval', (array) (((array) $this->get('players'))['eggs'] ?? [])));
    }

    private function default(string $key): mixed
    {
        return match ($key) {
            'quickActions' => [
                ['id' => 'console', 'action' => 'console', 'label' => 'Console', 'icon' => 'square-terminal', 'url' => null],
                ['id' => 'files', 'action' => 'files', 'label' => 'Files', 'icon' => 'folder', 'url' => null],
                ['id' => 'backups', 'action' => 'backups', 'label' => 'Backups', 'icon' => 'archive', 'url' => null],
            ],
            // Until the eggs are picked, the ones tagged as Minecraft.
            'players' => [
                'cards' => true,
                'dashboard' => true,
                'eggs' => Egg::query()->whereHas('tags', fn ($query) => $query->where('slug', 'minecraft'))->pluck('id')->map(fn ($id): int => (int) $id)->values()->all(),
            ],
            'locations' => ['dashboard' => true],
            default => [],
        };
    }
}
