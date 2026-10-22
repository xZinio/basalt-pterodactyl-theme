<?php

declare(strict_types=1);

namespace Basalt;

/**
 * Minecraft's Server List Ping: a handshake in the status state, then a status request, which a
 * Java edition server answers with JSON naming its version and the players online.
 */
final class MinecraftStatus
{
    /** @return array{online: int, max: int, version: ?string}|null */
    public static function query(string $host, int $port, float $timeout = 1.0): ?array
    {
        $socket = @stream_socket_client("tcp://{$host}:{$port}", $errno, $error, $timeout);
        if ($socket === false) {
            return null;
        }

        try {
            stream_set_timeout($socket, (int) ceil($timeout));

            $handshake = "\x00".self::varint(767).self::string($host).pack('n', $port)."\x01";
            fwrite($socket, self::varint(strlen($handshake)).$handshake."\x01\x00");

            $length = self::readVarint($socket);
            if ($length === null || $length < 2 || $length > 1_048_576) {
                return null;
            }

            $packet = '';
            while (strlen($packet) < $length) {
                $chunk = fread($socket, $length - strlen($packet));
                if ($chunk === false || $chunk === '') {
                    return null;
                }
                $packet .= $chunk;
            }

            $offset = 0;
            if (self::varintAt($packet, $offset) !== 0) {
                return null;
            }
            $size = self::varintAt($packet, $offset);
            $status = $size === null ? null : json_decode(substr($packet, $offset, $size), true);
            if (! is_array($status)) {
                return null;
            }

            return [
                'online' => (int) ($status['players']['online'] ?? 0),
                'max' => (int) ($status['players']['max'] ?? 0),
                'version' => isset($status['version']['name']) && is_string($status['version']['name']) ? $status['version']['name'] : null,
            ];
        } finally {
            fclose($socket);
        }
    }

    private static function varint(int $value): string
    {
        $value &= 0xFFFFFFFF;
        $bytes = '';
        do {
            $byte = $value & 0x7F;
            $value >>= 7;
            $bytes .= chr($value !== 0 ? $byte | 0x80 : $byte);
        } while ($value !== 0);

        return $bytes;
    }

    private static function string(string $value): string
    {
        return self::varint(strlen($value)).$value;
    }

    /** @param resource $socket */
    private static function readVarint($socket): ?int
    {
        $value = 0;
        for ($position = 0; $position < 5; $position++) {
            $byte = fread($socket, 1);
            if ($byte === false || $byte === '') {
                return null;
            }
            $value |= (ord($byte) & 0x7F) << (7 * $position);
            if ((ord($byte) & 0x80) === 0) {
                return $value;
            }
        }

        return null;
    }

    private static function varintAt(string $data, int &$offset): ?int
    {
        $value = 0;
        for ($position = 0; $position < 5 && $offset < strlen($data); $position++) {
            $byte = ord($data[$offset++]);
            $value |= ($byte & 0x7F) << (7 * $position);
            if (($byte & 0x80) === 0) {
                return $value;
            }
        }

        return null;
    }
}
