<?php

/*
 * Configures Basalt on the development panel the way the demo shows it: a panel name, an
 * announcement, sidebar and sign-in links, artwork for the eggs, the location's country, and the
 * demo user's folders and favourites. Run after the theme is installed:
 *
 *   docker compose exec -T panel php /seed/theme.php
 */

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Pterodactyl\Facades\Extensions;
use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Location;
use Pterodactyl\Models\User;

chdir('/app');
require '/app/vendor/autoload.php';
$app = require '/app/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

DB::table('settings')->updateOrInsert(['key' => 'settings::app:name'], ['value' => 'Basalt Demo']);

$settings = Extensions::settings('basalt');
$settings->setMany([
    'theme.announcementTitle' => 'Welcome to the Basalt demo',
    'theme.announcement' => 'You are signed in as an administrator, so you can try everything. Open **Admin → Themes** to change any setting of the theme.',
    'theme.announcementButton' => 'Open the settings|/panel/themes',
    'theme.navLinks' => 'Discord|https://discord.gg/pterodactyl|message-circle, Store|https://example.com/store|shopping-cart|dashboard, Documentation|https://pterodactyl.io/project/introduction.html|book-open, Server status|https://status.example.com|activity|server',
    'theme.loginLinks' => 'Support|https://discord.gg/pterodactyl, Follow us|https://example.com',
    'theme.supportUrl' => 'https://discord.gg/pterodactyl',
]);

// The eggs' card artwork (original drawings in ./art), served by the panel from public/dev-art.
$art = '/app/public/dev-art';
if (! is_dir($art)) {
    mkdir($art, 0755, true);
}
foreach (glob('/seed/art/*.svg') as $file) {
    copy($file, $art.'/'.basename($file));
}
foreach ([
    'Paper' => 'blocks-sunset',
    'Vanilla Minecraft' => 'blocks-day',
    'Forge Minecraft' => 'blocks-night',
    'Bungeecord' => 'blocks-dusk',
    'Rust' => 'wasteland',
    'Ark: Survival Evolved' => 'jungle',
    'Garrys Mod' => 'construct',
    'Teamspeak3 Server' => 'waves',
] as $name => $file) {
    $egg = Egg::query()->where('name', $name)->first();
    if ($egg !== null) {
        $settings->fields($egg)->set('banner', "/dev-art/{$file}.svg");
    }
}

// The node's location is in the Netherlands, so the servers' dashboards show its flag.
foreach (Location::query()->get() as $location) {
    $settings->fields($location)->set('flag', 'nl');
}

$demo = User::query()->where('username', 'demo')->firstOrFail();
$settings->forUser($demo)->setMany([
    'folders' => [
        ['id' => 'minecraft', 'name' => 'Minecraft network', 'icon' => 'pickaxe', 'servers' => [
            '0bdc2e62-4fa8-4b4e-9e5c-4e1bd89ca4d6',
            '82c2841e-e555-4f8a-9b1f-e258f4a12790',
            '021dc3e4-c312-4d19-8bdc-9c4351a9d083',
        ]],
        ['id' => 'survival', 'name' => 'Survival games', 'icon' => 'swords', 'servers' => ['964f641a-8664-4f05-b052-0209f15169d2']],
        ['id' => 'community', 'name' => 'Community', 'icon' => 'heart', 'servers' => [
            '288b132f-332f-4c85-89f0-71fa1bc82352',
            '1a77ce2b-499a-422c-9687-9eafb6bc32f5',
        ]],
    ],
    'favorites' => ['93fccbf3-fa25-4681-a05f-bd0e66f4caa0', '47b94ffd-c5f9-431a-8791-602fa82989bd'],
    'order' => [
        '93fccbf3-fa25-4681-a05f-bd0e66f4caa0',
        'ff5198d5-fa35-45f3-a1ba-80fda1ed3c3e',
        '47b94ffd-c5f9-431a-8791-602fa82989bd',
    ],
]);

Artisan::call('cache:clear');

echo "Configured Basalt for the demo user.\n";
