<?php

declare(strict_types=1);

namespace Basalt\Http;

use Basalt\ThemeSettings;
use Illuminate\Http\JsonResponse;

/**
 * The web app manifest of the Installable app setting: the app's name and colour, and its icon from
 * the favicon or the logo, else the panel's own.
 */
final readonly class ManifestController
{
    public function __construct(private ThemeSettings $settings)
    {
    }

    public function __invoke(): JsonResponse
    {
        $name = $this->settings->text('appName') ?? $this->settings->text('panelName') ?? (string) config('app.name', 'Pterodactyl');
        $color = $this->settings->get('appColor');
        $icon = $this->settings->text('favicon') ?? $this->settings->text('logo');

        return new JsonResponse([
            'name' => $name,
            'short_name' => $name,
            'start_url' => '/',
            'scope' => '/',
            'display' => 'standalone',
            'background_color' => $color,
            'theme_color' => $color,
            'icons' => $icon === null ? [
                ['src' => '/favicons/android-chrome-192x192.png', 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any'],
                ['src' => '/favicons/android-chrome-512x512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any maskable'],
            ] : [
                ['src' => $icon, 'sizes' => '192x192', 'purpose' => 'any'],
                ['src' => $icon, 'sizes' => '512x512', 'purpose' => 'any maskable'],
            ],
        ], 200, ['Content-Type' => 'application/manifest+json']);
    }
}
