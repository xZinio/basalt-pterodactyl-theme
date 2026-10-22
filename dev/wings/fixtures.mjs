// Fixed data for the mock daemon, keyed by the server uuids dev/seed/seed.php creates.
const MiB = 1024 * 1024;

const minecraftBoot = (world, port) => [
    `[18:20:21 INFO]: [bootstrap] Running Java 25 (OpenJDK 64-Bit Server VM 25+36-LTS; Eclipse Adoptium Temurin-25+36) on Linux 6.8.12-4-pve (amd64)`,
    `[18:20:21 INFO]: [bootstrap] Loading Paper 1.21.10-117-main@a1c3e07 (2026-10-02T09:14:51Z) for Minecraft 1.21.10`,
    `[18:20:23 INFO]: [PluginInitializerManager] Initializing plugins...`,
    `[18:20:23 INFO]: [PluginInitializerManager] Initialized 3 plugins`,
    `[18:20:23 INFO]: [PluginInitializerManager] Bukkit plugins (3):`,
    ` - Chunky (1.5.3), LuckPerms (5.5.71), WorldEdit (7.4.6)`,
    `[18:20:26 INFO]: Environment: Environment[sessionHost=https://sessionserver.mojang.com, servicesHost=https://api.minecraftservices.com, name=PROD]`,
    `[18:20:27 INFO]: Loaded 1407 recipes`,
    `[18:20:27 INFO]: Loaded 1520 advancements`,
    `[18:20:28 INFO]: [MCTypeRegistry] Initialising converters for DataConverter...`,
    `[18:20:29 INFO]: [MCTypeRegistry] Finished initialising converters for DataConverter in 312.4ms`,
    `[18:20:29 INFO]: Starting minecraft server version 1.21.10`,
    `[18:20:29 INFO]: Loading properties`,
    `[18:20:29 INFO]: This server is running Paper version 1.21.10-117-main@a1c3e07 (Implementing API version 1.21.10-R0.1-SNAPSHOT)`,
    `[18:20:29 INFO]: Server Ping Player Sample Count: 12`,
    `[18:20:29 INFO]: Using 4 threads for Netty based IO`,
    `[18:20:30 INFO]: [ChunkTaskScheduler] Chunk system is using population gen parallelism: true`,
    `[18:20:30 INFO]: Default game type: SURVIVAL`,
    `[18:20:30 INFO]: Generating keypair`,
    `[18:20:30 INFO]: Starting Minecraft server on 0.0.0.0:${port}`,
    `[18:20:30 INFO]: Using epoll channel type`,
    `[18:20:30 INFO]: Paper: Using libdeflate (Linux x86_64) compression from Velocity.`,
    `[18:20:30 INFO]: Paper: Using OpenSSL 3.x.x (Linux x86_64) cipher from Velocity.`,
    `[18:20:31 INFO]: [WorldEdit] Loading server plugin WorldEdit v7.4.6`,
    `[18:20:32 INFO]: [Chunky] Loading server plugin Chunky v1.5.3`,
    `[18:20:32 INFO]: [LuckPerms] Loading server plugin LuckPerms v5.5.71`,
    `[18:20:32 INFO]: [LuckPerms] Loading configuration...`,
    `[18:20:33 INFO]: [WorldEdit] Enabling WorldEdit v7.4.6`,
    `[18:20:33 INFO]: Registering commands with com.sk89q.worldedit.bukkit.BukkitServerInterface`,
    `[18:20:33 INFO]: WEPIF: Using the Bukkit Permissions API.`,
    `[18:20:34 INFO]: [LuckPerms] Enabling LuckPerms v5.5.71`,
    `[18:20:34 INFO]:         __    `,
    `[18:20:34 INFO]:   |    |__)   \u001b[0;36;1mLuckPerms \u001b[0;36;22mv5.5.71\u001b[m`,
    `[18:20:34 INFO]:   |___ |      \u001b[0;30;1mRunning on Bukkit - Paper\u001b[m`,
    `[18:20:34 INFO]: `,
    `[18:20:34 INFO]: [LuckPerms] Loading storage provider... [H2]`,
    `[18:20:35 INFO]: [LuckPerms] Loading internal permission managers...`,
    `[18:20:36 INFO]: [LuckPerms] Performing initial data load...`,
    `[18:20:36 INFO]: [LuckPerms] Successfully enabled. (took 2049ms)`,
    `[18:20:36 INFO]: Preparing level "${world}"`,
    `[18:20:38 INFO]: Preparing start region for dimension minecraft:overworld`,
    `[18:20:38 INFO]: Preparing spawn area: 100%`,
    `[18:20:38 INFO]: Prepared spawn area in 1 ms`,
    `[18:20:38 INFO]: Preparing start region for dimension minecraft:the_nether`,
    `[18:20:38 INFO]: Prepared spawn area in 1 ms`,
    `[18:20:38 INFO]: Preparing start region for dimension minecraft:the_end`,
    `[18:20:38 INFO]: Prepared spawn area in 0 ms`,
    `[18:20:38 INFO]: [Chunky] Enabling Chunky v1.5.3`,
    `[18:20:38 INFO]: [spark] Starting background profiler...`,
    `[18:20:38 INFO]: Running delayed init tasks`,
    `[18:20:38 INFO]: Done (16.481s)! For help, type "help"`,
    `[18:20:38 INFO]: Timings Reset`,
];

const server = (fields) => ({
    state: 'offline',
    cpu: 0,
    memoryBytes: 0,
    memoryLimitMb: 2048,
    diskBytes: 0,
    uptimeSeconds: 0,
    kind: 'generic',
    ...fields,
});

export const servers = {
    // Survival SMP
    '93fccbf3-fa25-4681-a05f-bd0e66f4caa0': server({
        state: 'running',
        cpu: 1.646,
        memoryBytes: 1079427072,
        memoryLimitMb: 3072,
        diskBytes: 271426839,
        uptimeSeconds: 251,
        rx: 122014,
        tx: 10639,
        kind: 'minecraft',
        world: 'world',
        port: 25565,
    }),
    // Creative Builds
    'ff5198d5-fa35-45f3-a1ba-80fda1ed3c3e': server({
        state: 'running',
        cpu: 1.076,
        memoryBytes: 913723392,
        memoryLimitMb: 2048,
        diskBytes: 242481849,
        uptimeSeconds: 197,
        rx: 122154,
        tx: 10771,
        kind: 'minecraft',
        world: 'creative',
        port: 25566,
    }),
    // Vanilla Lobby
    '0bdc2e62-4fa8-4b4e-9e5c-4e1bd89ca4d6': server({ diskBytes: 62294585, memoryLimitMb: 1024, kind: 'minecraft', world: 'world', port: 25567 }),
    // Rust Monthly Wipe
    '47b94ffd-c5f9-431a-8791-602fa82989bd': server({ memoryLimitMb: 8192, kind: 'rust' }),
    // TeamSpeak
    '1a77ce2b-499a-422c-9687-9eafb6bc32f5': server({ memoryLimitMb: 512 }),
    // Garry's Mod TTT
    '288b132f-332f-4c85-89f0-71fa1bc82352': server({ memoryLimitMb: 2048 }),
    // Network Proxy
    '82c2841e-e555-4f8a-9b1f-e258f4a12790': server({ memoryLimitMb: 1024, kind: 'minecraft', port: 25568 }),
    // Forge Modpack
    '021dc3e4-c312-4d19-8bdc-9c4351a9d083': server({ memoryLimitMb: 6144, kind: 'minecraft', port: 25569 }),
    // Ark Island
    '964f641a-8664-4f05-b052-0209f15169d2': server({ memoryLimitMb: 8192 }),
    default: server({}),
};

export function consoleLines(fixture) {
    if (fixture.kind === 'minecraft' && fixture.state === 'running') return minecraftBoot(fixture.world, fixture.port);
    return [];
}

const daysAgo = (days, hour = 21, minute = 11) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
};
const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

const dir = (name, modified) => ({
    name,
    mode: 'drwxr-xr-x',
    mode_bits: '755',
    size: 4096,
    file: false,
    symlink: false,
    mime: 'inode/directory',
    created: modified,
    modified,
});
const file = (name, size, modified, mime = 'text/plain; charset=utf-8') => ({
    name,
    mode: '-rw-r--r--',
    mode_bits: '644',
    size,
    file: true,
    symlink: false,
    mime,
    created: modified,
    modified,
});

const minecraftRoot = () => [
    dir('.cache', daysAgo(8)),
    dir('.paper', daysAgo(8, 21, 17)),
    dir('cache', daysAgo(8)),
    dir('config', minutesAgo(4)),
    dir('libraries', daysAgo(8)),
    dir('logs', minutesAgo(5)),
    dir('plugins', daysAgo(8, 21, 18)),
    dir('versions', daysAgo(8)),
    dir('world', minutesAgo(4)),
    file('banned-ips.json', 2, minutesAgo(4), 'application/json'),
    file('banned-players.json', 2, minutesAgo(4), 'application/json'),
    file('bukkit.yml', 1147, minutesAgo(4)),
    file('commands.yml', 491, minutesAgo(4)),
    file('eula.txt', 10, daysAgo(8, 21, 17)),
    file('ops.json', 139, minutesAgo(4), 'application/json'),
    file('server.jar', 55145431, daysAgo(8), 'application/java-archive'),
    file('server.properties', 1772, minutesAgo(4)),
    file('spigot.yml', 4977, minutesAgo(4)),
    file('usercache.json', 315, minutesAgo(4), 'application/json'),
    file('wepif.yml', 1454, daysAgo(8, 21, 17)),
    file('whitelist.json', 163, daysAgo(8, 21, 18), 'application/json'),
];

const genericRoot = () => [
    dir('logs', daysAgo(2)),
    dir('steamapps', daysAgo(8)),
    file('start.sh', 312, daysAgo(8)),
    file('server.cfg', 1840, daysAgo(3)),
];

export function directoryFor(fixture, directory) {
    if (directory === '/' || directory === '') return fixture.kind === 'minecraft' ? minecraftRoot() : genericRoot();
    if (directory.replace(/\/$/, '').endsWith('logs')) return [file('latest.log', 18342, minutesAgo(1))];
    if (directory.replace(/\/$/, '').endsWith('plugins')) {
        return [
            dir('LuckPerms', daysAgo(8, 21, 18)),
            dir('WorldEdit', daysAgo(8, 21, 18)),
            file('Chunky-1.5.3.jar', 405219, daysAgo(8, 21, 18), 'application/java-archive'),
            file('LuckPerms-Bukkit-5.5.71.jar', 2297344, daysAgo(8, 21, 18), 'application/java-archive'),
            file('worldedit-bukkit-7.4.6.jar', 9437184, daysAgo(8, 21, 18), 'application/java-archive'),
        ];
    }
    return [];
}

const contents = {
    'eula.txt': 'eula=true\n',
    'server.properties': [
        '#Minecraft server properties',
        'allow-flight=false',
        'difficulty=normal',
        'enable-command-block=false',
        'enforce-secure-profile=true',
        'gamemode=survival',
        'max-players=20',
        'motd=A Minecraft Server',
        'online-mode=true',
        'pvp=true',
        'server-port=25565',
        'simulation-distance=10',
        'spawn-protection=16',
        'view-distance=10',
        'white-list=false',
        '',
    ].join('\n'),
    'ops.json': '[\n  {\n    "uuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5",\n    "name": "Notch",\n    "level": 4,\n    "bypassesPlayerLimit": false\n  }\n]\n',
    'whitelist.json': '[]\n',
    'banned-ips.json': '[]\n',
    'banned-players.json': '[]\n',
};

export function fileContent(fixture, path) {
    const name = path.split('/').pop();
    return contents[name] ?? `# ${name}\n`;
}
