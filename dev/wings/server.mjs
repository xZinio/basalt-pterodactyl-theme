// A stand-in for Wings: the HTTP API the panel calls and the websocket the browser opens, serving
// fixed fixtures so a development panel's server pages render without Docker game servers.
// It accepts every token; never expose it beyond a development machine.
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { servers, directoryFor, fileContent, consoleLines } from './fixtures.mjs';
import { startStatusResponder } from './slp.mjs';

const PORT = Number(process.env.PORT || 8443);
const started = Date.now();

/** Live state per server uuid: power state, counters and the sockets watching it. */
const live = new Map();

function stateFor(uuid) {
    let entry = live.get(uuid);
    if (!entry) {
        const fixture = servers[uuid] ?? servers.default;
        entry = {
            fixture,
            state: fixture.state,
            bootedAt: fixture.state === 'running' ? started - fixture.uptimeSeconds * 1000 : 0,
            rx: fixture.rx ?? 0,
            tx: fixture.tx ?? 0,
            log: [...consoleLines(fixture)],
            sockets: new Set(),
        };
        live.set(uuid, entry);
    }
    return entry;
}

function stats(entry) {
    const running = entry.state === 'running' || entry.state === 'starting' || entry.state === 'stopping';
    const t = (Date.now() - started) / 1000;
    const f = entry.fixture;
    if (running) {
        entry.rx += Math.round(40 + 30 * Math.abs(Math.sin(t / 3)));
        entry.tx += Math.round(5 + 4 * Math.abs(Math.cos(t / 5)));
    }
    return {
        memory_bytes: running ? Math.round(f.memoryBytes * (1 + 0.01 * Math.sin(t / 7))) : 0,
        memory_limit_bytes: f.memoryLimitMb * 1024 * 1024,
        cpu_absolute: running ? Number((f.cpu * (1 + 0.15 * Math.sin(t / 2))).toFixed(3)) : 0,
        network: { rx_bytes: running ? entry.rx : 0, tx_bytes: running ? entry.tx : 0 },
        state: entry.state,
        disk_bytes: f.diskBytes,
        uptime: running ? Date.now() - entry.bootedAt : 0,
    };
}

function broadcast(entry, event, ...args) {
    const frame = JSON.stringify({ event, args });
    for (const socket of entry.sockets) {
        if (socket.readyState === socket.OPEN) socket.send(frame);
    }
}

function pushLine(entry, line) {
    entry.log.push(line);
    if (entry.log.length > 150) entry.log.splice(0, entry.log.length - 150);
    broadcast(entry, 'console output', line);
}

const timestamp = () => new Date().toTimeString().slice(0, 8);

function setPower(entry, action) {
    if (action === 'start' && entry.state === 'offline') {
        entry.state = 'starting';
        broadcast(entry, 'status', 'starting');
        pushLine(entry, '\u001b[33m\u001b[1m[Pterodactyl Daemon]:\u001b[39m Server marked as starting...\u001b[0m');
        setTimeout(() => {
            entry.state = 'running';
            entry.bootedAt = Date.now();
            broadcast(entry, 'status', 'running');
            pushLine(entry, `[${timestamp()} INFO]: Done! For help, type "help"`);
        }, 2500);
    } else if ((action === 'stop' || action === 'kill') && entry.state !== 'offline') {
        entry.state = 'stopping';
        broadcast(entry, 'status', 'stopping');
        pushLine(entry, `[${timestamp()} INFO]: Stopping server`);
        setTimeout(() => {
            entry.state = 'offline';
            broadcast(entry, 'status', 'offline');
            pushLine(entry, '\u001b[33m\u001b[1m[Pterodactyl Daemon]:\u001b[39m Server marked as offline...\u001b[0m');
        }, action === 'kill' ? 200 : 1500);
    } else if (action === 'restart') {
        setPower(entry, 'stop');
        setTimeout(() => setPower(entry, 'start'), 1800);
    }
}

function send(res, status, body, headers = {}) {
    const isJson = body !== undefined && typeof body !== 'string';
    res.writeHead(status, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        ...(isJson ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
    });
    res.end(body === undefined ? undefined : isJson ? JSON.stringify(body) : body);
}

async function readBody(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString('utf8');
    try {
        return text ? JSON.parse(text) : {};
    } catch {
        return { raw: text };
    }
}

const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    if (req.method === 'OPTIONS') return send(res, 204);

    if (path === '/api/system') {
        return send(res, 200, {
            architecture: 'amd64',
            cpu_count: 4,
            kernel_version: '6.8.12-4-pve',
            os: 'linux',
            version: '1.13.3',
        });
    }
    if (path === '/api/update' || path === '/api/deauthorize-user') return send(res, 204);
    if (path === '/api/servers' && req.method === 'POST') return send(res, 202);

    const match = path.match(/^\/api\/servers\/([0-9a-f-]{36})(\/.*)?$/);
    if (match) {
        const [, uuid, rest = ''] = match;
        const entry = stateFor(uuid);
        const body = req.method === 'GET' ? {} : await readBody(req);

        if (rest === '' && req.method === 'GET') {
            const s = stats(entry);
            return send(res, 200, {
                state: entry.state,
                is_suspended: false,
                utilization: {
                    memory_bytes: s.memory_bytes,
                    memory_limit_bytes: s.memory_limit_bytes,
                    cpu_absolute: s.cpu_absolute,
                    network: s.network,
                    uptime: s.uptime,
                    state: entry.state,
                    disk_bytes: s.disk_bytes,
                },
            });
        }
        if (rest === '' && req.method === 'DELETE') return send(res, 204);
        if (rest === '/power') {
            setPower(entry, body.action);
            return send(res, 204);
        }
        if (rest === '/commands') {
            for (const command of body.commands ?? []) pushLine(entry, `> ${command}`);
            return send(res, 204);
        }
        if (rest === '/logs') return send(res, 200, { data: entry.log.slice(-Number(url.searchParams.get('size') || 100)) });
        if (rest === '/files/list-directory') {
            return send(res, 200, directoryFor(entry.fixture, url.searchParams.get('directory') || '/'));
        }
        if (rest === '/files/contents') {
            const content = fileContent(entry.fixture, url.searchParams.get('file') || '');
            return send(res, 200, content, { 'Content-Type': 'text/plain', 'Content-Length': Buffer.byteLength(content) });
        }
        if (rest === '/files/compress') {
            const now = new Date().toISOString();
            return send(res, 200, {
                name: `archive-${now.slice(0, 10)}.tar.gz`,
                mode: '-rw-r--r--',
                mode_bits: '644',
                size: 1024,
                file: true,
                symlink: false,
                mime: 'application/tar+gzip',
                created: now,
                modified: now,
            });
        }
        // sync, reinstall, transfer, backups and the other file mutations succeed without doing anything.
        return send(res, 204);
    }

    if (path.startsWith('/upload/') || path.startsWith('/download/')) return send(res, 204);
    return send(res, 404, { error: 'The requested resource does not exist on this instance.' });
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
    const match = new URL(req.url, 'http://localhost').pathname.match(/^\/api\/servers\/([0-9a-f-]{36})\/ws$/);
    if (!match) return socket.destroy();
    wss.handleUpgrade(req, socket, head, (ws) => {
        const entry = stateFor(match[1]);
        let authed = false;
        let timer = null;
        ws.on('message', (raw) => {
            let message;
            try {
                message = JSON.parse(raw.toString());
            } catch {
                return;
            }
            const { event, args = [] } = message;
            if (event === 'auth') {
                authed = true;
                entry.sockets.add(ws);
                ws.send(JSON.stringify({ event: 'auth success' }));
                ws.send(JSON.stringify({ event: 'status', args: [entry.state] }));
                timer ??= setInterval(() => {
                    if (entry.state !== 'offline') ws.send(JSON.stringify({ event: 'stats', args: [JSON.stringify(stats(entry))] }));
                }, 1000);
                return;
            }
            if (!authed) return;
            if (event === 'send logs') {
                for (const line of entry.log) ws.send(JSON.stringify({ event: 'console output', args: [line] }));
            } else if (event === 'send stats') {
                ws.send(JSON.stringify({ event: 'stats', args: [JSON.stringify(stats(entry))] }));
            } else if (event === 'set state') {
                setPower(entry, args[0]);
            } else if (event === 'send command') {
                pushLine(entry, `> ${args[0]}`);
            }
        });
        ws.on('close', () => {
            entry.sockets.delete(ws);
            if (timer) clearInterval(timer);
        });
    });
});

server.listen(PORT, '0.0.0.0', () => console.log(`mock wings listening on :${PORT}`));

// Running Minecraft servers answer status pings on their game port, as the real ones would.
for (const [uuid, fixture] of Object.entries(servers)) {
    if (fixture.kind !== 'minecraft' || !fixture.port) continue;
    startStatusResponder({
        port: fixture.port,
        motd: fixture.motd ?? 'A Minecraft Server',
        version: 'Paper 1.21.10',
        max: 20,
        online: () => (stateFor(uuid).state === 'running' ? fixture.players ?? 0 : 0),
    });
}
