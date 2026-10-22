<?php

declare(strict_types=1);

namespace Basalt;

use Basalt\Fields\EggFields;
use Basalt\Fields\LocationFields;
use Pterodactyl\Extensions\ExtensionProvider;
use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Location;

/**
 * The theme's backend: the API its dashboard reads and writes (folders, favourites, server
 * artwork, player counts), and the fields it adds to the admin forms of eggs and locations.
 */
final class BasaltProvider extends ExtensionProvider
{
    public function boot(): void
    {
        $this->registerClientApiRoutes($this->extensionPath('routes', 'client.php'));
        $this->registerFields(Egg::class, EggFields::class);
        $this->registerFields(Location::class, LocationFields::class);
    }
}
