<?php

declare(strict_types=1);

namespace Basalt;

use Basalt\Fields\EggFields;
use Basalt\Fields\LocationFields;
use Basalt\Http\DefaultScheme;
use Basalt\Http\FramePreview;
use Basalt\Http\VersionController;
use Illuminate\Routing\Router;
use Pterodactyl\Extensions\ExtensionProvider;
use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Location;
use Pterodactyl\Services\Themes\ThemeRepository;

/**
 * The theme's backend: the API its dashboard reads and writes (folders, favourites, server
 * artwork, player counts), the version check on the admin overview, the frames of the studio's
 * live preview, the settings the document head and the colour mode follow, and the fields it
 * adds to the admin forms of eggs and locations.
 */
final class BasaltProvider extends ExtensionProvider
{
    public function boot(): void
    {
        $this->app->singleton(ThemeSettings::class, fn (): ThemeSettings => new ThemeSettings($this->app->make(ThemeRepository::class), $this->extension));

        $this->registerClientApiRoutes($this->extensionPath('routes', 'client.php'));
        $this->registerAdminApiRoutes($this->extensionPath('routes', 'admin.php'));
        $this->registerWebRoutes($this->extensionPath('routes', 'web.php'));
        $this->app->when(VersionController::class)->needs('$installed')->give($this->extension->version);
        $this->app->make(Router::class)->pushMiddlewareToGroup('web', FramePreview::class);
        $this->app->make(Router::class)->pushMiddlewareToGroup('web', DefaultScheme::class);
        $this->registerHeadTags(fn (): array => $this->app->make(HeadTags::class)());
        $this->registerFields(Egg::class, EggFields::class);
        $this->registerFields(Location::class, LocationFields::class);
    }
}
