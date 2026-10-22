// A Minecraft Server List Ping responder: answers status requests on a game port the way a Java
// edition server does, so the panel can read "players online" from a mock server.
import { createServer } from 'node:net';

function readVarint(buffer, offset) {
    let value = 0;
    for (let position = 0; position < 5; position++) {
        if (offset + position >= buffer.length) return null;
        const byte = buffer[offset + position];
        value |= (byte & 0x7f) << (7 * position);
        if ((byte & 0x80) === 0) return { value, size: position + 1 };
    }
    return null;
}

function varint(value) {
    const bytes = [];
    do {
        let byte = value & 0x7f;
        value >>>= 7;
        if (value !== 0) byte |= 0x80;
        bytes.push(byte);
    } while (value !== 0);
    return Buffer.from(bytes);
}

function packet(id, payload) {
    const body = Buffer.concat([varint(id), payload]);
    return Buffer.concat([varint(body.length), body]);
}

export function startStatusResponder({ port, motd, version, max, online }) {
    const server = createServer((socket) => {
        let buffer = Buffer.alloc(0);
        socket.on('data', (data) => {
            buffer = Buffer.concat([buffer, data]);
            for (;;) {
                const length = readVarint(buffer, 0);
                if (!length || buffer.length < length.size + length.value) return;
                const body = buffer.subarray(length.size, length.size + length.value);
                buffer = buffer.subarray(length.size + length.value);
                const id = readVarint(body, 0);
                if (!id) continue;
                if (id.value === 0 && body.length === 1) {
                    const status = JSON.stringify({
                        version: { name: version, protocol: 773 },
                        players: { max, online: online(), sample: [] },
                        description: { text: motd },
                    });
                    const text = Buffer.from(status, 'utf8');
                    socket.write(packet(0, Buffer.concat([varint(text.length), text])));
                } else if (id.value === 1) {
                    socket.write(packet(1, body.subarray(id.size)));
                    socket.end();
                }
            }
        });
        socket.on('error', () => {});
    });
    server.on('error', (error) => console.log(`status responder on :${port} failed:`, error.message));
    server.listen(port, '127.0.0.1');
    return server;
}
