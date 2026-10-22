<?php

/*
 * Development fixtures: users, a location, a node pointing at the mock Wings, nine servers with
 * fixed uuids (dev/wings/fixtures.mjs serves their data) and the schedules, backups, databases,
 * subusers and activity their pages list. Re-running replaces the fixture rows.
 *
 *   docker compose exec -T panel php /seed/seed.php
 */

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

chdir('/app');
require '/app/vendor/autoload.php';
$app = require '/app/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$now = Carbon::now();
$created = Carbon::now()->subDays(8)->setTime(21, 9);

DB::statement('SET FOREIGN_KEY_CHECKS=0');
foreach (['activity_log_subjects', 'activity_logs', 'tasks', 'schedules', 'backups', 'databases', 'database_hosts', 'subusers', 'server_variables', 'servers', 'allocations', 'nodes', 'locations', 'users'] as $table) {
    DB::table($table)->truncate();
}
DB::statement('SET FOREIGN_KEY_CHECKS=1');

// Users. The demo account is a root admin; everyone else signs in with "password".
$people = [
    ['demo', 'Demo', 'User', 'demo@example.com', true],
    ['alex.morgan', 'Alex', 'Morgan', 'alex.morgan@example.com', false],
    ['sam.lee', 'Sam', 'Lee', 'sam.lee@example.com', false],
    ['jordan.vos', 'Jordan', 'Vos', 'jordan.vos@example.com', false],
    ['priya.kapoor', 'Priya', 'Kapoor', 'priya.kapoor@example.com', false],
    ['tom.hendriks', 'Tom', 'Hendriks', 'tom.hendriks@example.com', false],
    ['mila.roos', 'Mila', 'Roos', 'mila.roos@example.com', false],
];
$userIds = [];
foreach ($people as [$username, $first, $last, $email, $admin]) {
    $userIds[$username] = DB::table('users')->insertGetId([
        'uuid' => (string) Str::uuid(),
        'username' => $username,
        'email' => $email,
        'name_first' => $first,
        'name_last' => $last,
        'password' => Hash::make($username === 'demo' ? 'demodemo' : 'password'),
        'language' => 'en',
        'root_admin' => $admin,
        'use_totp' => false,
        'gravatar' => true,
        'created_at' => $created,
        'updated_at' => $created,
    ]);
}
$demo = $userIds['demo'];

$locationId = DB::table('locations')->insertGetId([
    'short' => 'demo',
    'long' => 'Development location',
    'created_at' => $created,
    'updated_at' => $created,
]);

// The node is the mock daemon, which shares the panel container's network: "localhost:8443" reaches
// it from the panel and, through the published port, from the browser.
$nodeId = DB::table('nodes')->insertGetId([
    'uuid' => (string) Str::uuid(),
    'public' => 1,
    'name' => 'dev-node',
    'description' => 'Development node served by the mock Wings daemon',
    'location_id' => $locationId,
    'fqdn' => 'localhost',
    'scheme' => 'http',
    'behind_proxy' => false,
    'maintenance_mode' => false,
    'memory' => 65536,
    'memory_overallocate' => 0,
    'disk' => 400000,
    'disk_overallocate' => 0,
    'upload_size' => 100,
    'daemon_token_id' => Str::random(16),
    'daemon_token' => Crypt::encrypt(Str::random(64)),
    'daemonListen' => 8443,
    'daemonSFTP' => 2022,
    'daemonBase' => '/var/lib/pterodactyl/volumes',
    'created_at' => $created,
    'updated_at' => $created,
]);

$eggs = DB::table('eggs')->pluck('id', 'name');
$servers = [
    ['Survival SMP', '93fccbf3-fa25-4681-a05f-bd0e66f4caa0', 'Paper', 25565, 3072, 8000, 200, 'The main survival world. Paper, latest version.'],
    ['Creative Builds', 'ff5198d5-fa35-45f3-a1ba-80fda1ed3c3e', 'Paper', 25566, 2048, 5000, 150, 'Flat creative world for build events.'],
    ['Vanilla Lobby', '0bdc2e62-4fa8-4b4e-9e5c-4e1bd89ca4d6', 'Vanilla Minecraft', 25567, 1024, 3000, 100, 'The lobby players join first.'],
    ['Rust Monthly Wipe', '47b94ffd-c5f9-431a-8791-602fa82989bd', 'Rust', 28015, 8192, 20000, 300, 'Procedural map, wipes on the first Thursday.'],
    ['TeamSpeak', '1a77ce2b-499a-422c-9687-9eafb6bc32f5', 'Teamspeak3 Server', 9987, 512, 2000, 50, 'Voice chat for the community.'],
    ["Garry's Mod TTT", '288b132f-332f-4c85-89f0-71fa1bc82352', 'Garrys Mod', 27015, 2048, 10000, 150, 'Trouble in Terrorist Town on weekends.'],
    ['Network Proxy', '82c2841e-e555-4f8a-9b1f-e258f4a12790', 'Bungeecord', 25568, 1024, 2000, 100, 'BungeeCord in front of the Minecraft network.'],
    ['Forge Modpack', '021dc3e4-c312-4d19-8bdc-9c4351a9d083', 'Forge Minecraft', 25569, 6144, 15000, 300, 'Modded survival with a curated pack.'],
    ['Ark Island', '964f641a-8664-4f05-b052-0209f15169d2', 'Ark: Survival Evolved', 27016, 8192, 30000, 300, 'The Island with boosted rates.'],
];

$serverIds = [];
foreach ($servers as $index => [$name, $uuid, $eggName, $port, $memory, $disk, $cpu, $description]) {
    $egg = DB::table('eggs')->where('id', $eggs[$eggName])->first();
    $images = json_decode($egg->docker_images, true) ?: [];
    $allocationId = DB::table('allocations')->insertGetId([
        'node_id' => $nodeId,
        'ip' => '127.0.0.1',
        'ip_alias' => 'play.example.net',
        'port' => $port,
        'notes' => null,
        'created_at' => $created,
        'updated_at' => $created,
    ]);
    $serverId = DB::table('servers')->insertGetId([
        'external_id' => (string) (101 + $index),
        'uuid' => $uuid,
        'uuidShort' => substr($uuid, 0, 8),
        'node_id' => $nodeId,
        'name' => $name,
        'description' => $description,
        'status' => null,
        'skip_scripts' => false,
        'owner_id' => $demo,
        'memory' => $memory,
        'swap' => 0,
        'disk' => $disk,
        'io' => 500,
        'cpu' => $cpu,
        'threads' => null,
        'oom_disabled' => true,
        'allocation_id' => $allocationId,
        'nest_id' => null,
        'egg_id' => $egg->id,
        'startup' => $egg->startup,
        'image' => array_values($images)[0] ?? 'ghcr.io/pterodactyl/yolks:java_21',
        'allocation_limit' => 2,
        'database_limit' => 2,
        'backup_limit' => 3,
        'created_at' => $created,
        'updated_at' => $created,
        'installed_at' => $created,
    ]);
    DB::table('allocations')->where('id', $allocationId)->update(['server_id' => $serverId]);
    foreach (DB::table('egg_variables')->where('egg_id', $egg->id)->get() as $variable) {
        DB::table('server_variables')->insert([
            'server_id' => $serverId,
            'variable_id' => $variable->id,
            'variable_value' => (string) $variable->default_value,
            'created_at' => $created,
            'updated_at' => $created,
        ]);
    }
    $serverIds[$name] = $serverId;
}

// Spare ports, so "New allocation" has something to assign.
foreach ([25570, 25571, 25572, 25573, 28016, 27017] as $port) {
    DB::table('allocations')->insert([
        'node_id' => $nodeId,
        'ip' => '127.0.0.1',
        'ip_alias' => 'play.example.net',
        'port' => $port,
        'created_at' => $created,
        'updated_at' => $created,
    ]);
}

$smp = $serverIds['Survival SMP'];

// Schedules and their tasks.
$schedules = [
    [$smp, 'Daily restart', '0', '4', [['command', 'say Restarting in 5 minutes', 0], ['power', 'restart', 300]]],
    [$smp, 'Nightly backup', '30', '3', [['command', 'save-all', 0], ['backup', '', 30]]],
    [$serverIds['Creative Builds'], 'Daily restart', '0', '5', [['power', 'restart', 0]]],
    [$serverIds['Rust Monthly Wipe'], 'Wipe reminder', '0', '18', [['command', 'say The map wipes on Thursday', 0]]],
];
foreach ($schedules as [$serverId, $name, $minute, $hour, $tasks]) {
    $scheduleId = DB::table('schedules')->insertGetId([
        'server_id' => $serverId,
        'name' => $name,
        'cron_day_of_week' => '*',
        'cron_month' => '*',
        'cron_day_of_month' => '*',
        'cron_hour' => $hour,
        'cron_minute' => $minute,
        'is_active' => true,
        'is_processing' => false,
        'only_when_online' => false,
        'last_run_at' => $now->copy()->subHours(14),
        'next_run_at' => $now->copy()->addHours(10),
        'created_at' => $created,
        'updated_at' => $created,
    ]);
    foreach ($tasks as $sequence => [$action, $payload, $offset]) {
        DB::table('tasks')->insert([
            'schedule_id' => $scheduleId,
            'sequence_id' => $sequence + 1,
            'action' => $action,
            'payload' => $payload,
            'time_offset' => $offset,
            'is_queued' => false,
            'continue_on_failure' => false,
            'created_at' => $created,
            'updated_at' => $created,
        ]);
    }
}

// Backups.
foreach ([
    ['Before the 1.21 update', 219796275, 35, 'bb9a4aea93b373089ad92c76bb41cdb4a1a6296b'],
    ['Backup at '.$now->copy()->subDays(7)->format('Y-m-d H:i:s'), 253591060, 28, 'f0774f00a72a0ca923523105c321c789f6cc9e96'],
] as [$name, $bytes, $minutes, $sha]) {
    DB::table('backups')->insert([
        'server_id' => $smp,
        'uuid' => (string) Str::uuid(),
        'is_successful' => true,
        'is_locked' => false,
        'name' => $name,
        'ignored_files' => '[]',
        'disk' => 'wings',
        'checksum' => 'sha1:'.$sha,
        'bytes' => $bytes,
        'completed_at' => $now->copy()->subMinutes($minutes),
        'created_at' => $now->copy()->subMinutes($minutes + 1),
        'updated_at' => $now->copy()->subMinutes($minutes),
    ]);
}

// A database host and two databases on it.
$hostId = DB::table('database_hosts')->insertGetId([
    'name' => 'Local MariaDB',
    'host' => '127.0.0.1',
    'port' => 3306,
    'username' => 'pterodactyl',
    'password' => Crypt::encrypt('development'),
    'max_databases' => null,
    'node_id' => $nodeId,
    'created_at' => $created,
    'updated_at' => $created,
]);
foreach (['luckperms' => 'u1_DfVNwHUlJr', 'coreprotect' => 'u1_wqmabb8EDi'] as $database => $username) {
    DB::table('databases')->insert([
        'server_id' => $smp,
        'database_host_id' => $hostId,
        'database' => 's1_'.$database,
        'username' => $username,
        'remote' => '%',
        'password' => Crypt::encrypt(Str::random(24)),
        'max_connections' => 0,
        'created_at' => $created,
        'updated_at' => $created,
    ]);
}

// Subusers.
DB::table('subusers')->insert([
    'user_id' => $userIds['alex.morgan'],
    'server_id' => $smp,
    'permissions' => json_encode(['websocket.connect', 'control.console', 'control.start', 'control.stop', 'control.restart', 'file.read', 'file.create', 'file.update', 'backup.read']),
    'created_at' => $created,
    'updated_at' => $created,
]);
DB::table('subusers')->insert([
    'user_id' => $userIds['sam.lee'],
    'server_id' => $smp,
    'permissions' => json_encode(['websocket.connect', 'control.console', 'file.read', 'backup.read']),
    'created_at' => $created,
    'updated_at' => $created,
]);

// Activity, newest first in the feeds.
$activity = [
    ['server:console.command', ['command' => 'weather clear'], 2 * 60, '203.0.113.58'],
    ['server:console.command', ['command' => 'time set day'], 3 * 60, '198.51.100.7'],
    ['server:power.restart', [], 4 * 60, '203.0.113.24'],
    ['server:file.download', ['file' => '/logs/latest.log'], 5 * 60, '203.0.113.58'],
    ['server:console.command', ['command' => 'say Event starts in 10 minutes!'], 6 * 60, '198.51.100.7'],
    ['server:file.write', ['file' => '/server.properties'], 7 * 60, '203.0.113.24'],
    ['server:startup.edit', ['variable' => 'BUILD_NUMBER', 'old' => '110', 'new' => 'latest'], 8 * 60, '203.0.113.58'],
    ['server:power.stop', [], 9 * 60, '198.51.100.7'],
    ['server:database.create', ['name' => 's1_luckperms'], 10 * 60, '203.0.113.24'],
    ['server:subuser.create', ['email' => 'alex.morgan@example.com'], 11 * 60, '203.0.113.58'],
    ['server:file.create-directory', ['directory' => '/', 'name' => 'schematics'], 13 * 60, '203.0.113.24'],
    ['server:power.start', [], 15 * 60, '198.51.100.7'],
    ['server:backup.start', ['name' => 'Before the 1.21 update'], 17 * 60, '203.0.113.58'],
    ['server:schedule.create', ['name' => 'Daily restart'], 18 * 60, '198.51.100.7'],
    ['server:file.uploaded', ['directory' => '/plugins/', 'file' => 'LuckPerms-Bukkit.jar'], 19 * 60, '203.0.113.24'],
];
foreach ($activity as [$event, $properties, $minutes, $ip]) {
    $logId = DB::table('activity_logs')->insertGetId([
        'batch' => null,
        'event' => $event,
        'ip' => $ip,
        'description' => null,
        'actor_type' => 'user',
        'actor_id' => $demo,
        'api_key_id' => null,
        'properties' => json_encode($properties ?: new stdClass()),
        'timestamp' => $now->copy()->subMinutes($minutes),
    ]);
    DB::table('activity_log_subjects')->insert(['activity_log_id' => $logId, 'subject_type' => 'server', 'subject_id' => $smp]);
    DB::table('activity_log_subjects')->insert(['activity_log_id' => $logId, 'subject_type' => 'user', 'subject_id' => $demo]);
}
foreach ([1, 18, 31, 42] as $minutes) {
    $logId = DB::table('activity_logs')->insertGetId([
        'event' => 'auth:success',
        'ip' => '203.0.113.'.(10 + $minutes),
        'actor_type' => 'user',
        'actor_id' => $demo,
        'properties' => '{}',
        'timestamp' => $now->copy()->subMinutes($minutes),
    ]);
    DB::table('activity_log_subjects')->insert(['activity_log_id' => $logId, 'subject_type' => 'user', 'subject_id' => $demo]);
}

echo sprintf("Seeded %d users, %d servers on node #%d.\n", count($userIds), count($serverIds), $nodeId);
