<?php

declare(strict_types=1);

namespace Basalt\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * The installed Basalt and its latest release on GitHub, for the admin overview. GitHub is asked
 * at most every six hours, or every half hour after it could not be reached; while it names no
 * release, `latest` is null and the overview only says which version runs.
 */
final class VersionController
{
    private const RELEASES = 'https://api.github.com/repos/xZinio/basalt-pterodactyl-theme/releases/latest';

    private const CACHE_KEY = 'basalt:latest-release';

    public function __construct(private readonly string $installed)
    {
    }

    public function __invoke(): JsonResponse
    {
        $latest = $this->latest();

        return new JsonResponse([
            'current' => $this->installed,
            'latest' => $latest,
            'is_latest' => $latest === null ? null : version_compare($this->installed, $latest, '>='),
        ]);
    }

    /** The latest release's version without its leading "v", or null. */
    private function latest(): ?string
    {
        $cached = Cache::get(self::CACHE_KEY);
        if (is_array($cached)) {
            return $cached['version'];
        }

        try {
            $response = Http::timeout(5)->acceptJson()->withHeaders(['User-Agent' => 'basalt-theme'])->get(self::RELEASES);
            $tag = $response->ok() ? $response->json('tag_name') : null;
            $version = is_string($tag) ? ltrim($tag, 'vV') : null;
            // A repository without releases answers 404, which is as settled an answer as a release.
            $settled = $response->ok() || $response->status() === 404;
        } catch (Throwable) {
            $version = null;
            $settled = false;
        }

        Cache::put(self::CACHE_KEY, ['version' => $version], $settled ? now()->addHours(6) : now()->addMinutes(30));

        return $version;
    }
}
