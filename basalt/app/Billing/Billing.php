<?php

declare(strict_types=1);

namespace Basalt\Billing;

use Illuminate\Support\Facades\Cache;
use Pterodactyl\Facades\Extensions;
use Pterodactyl\Models\Server;
use Pterodactyl\Services\Extensions\ExtensionSettings;
use Throwable;

/**
 * The billing system the servers are sold through, Paymenter or WHMCS, and each server's service
 * in it, matched on the server's external ID. Its API key or secret is stored encrypted and never
 * sent back. A service is read again after five minutes, or one minute when it could not be.
 */
final class Billing
{
    public const array PROVIDERS = ['none', 'paymenter', 'whmcs'];

    private const int TTL = 300;

    private const int FAILED_TTL = 60;

    private ExtensionSettings $settings;

    public function __construct()
    {
        $this->settings = Extensions::settings('basalt');
    }

    /**
     * The settings as the studio shows them: whether a key and a secret are saved, never them.
     *
     * @return array{provider: string, url: string, identifier: string, has_key: bool, has_secret: bool, block: bool, alert: bool}
     */
    public function settings(): array
    {
        $provider = $this->settings->get('billing.provider');

        return [
            'provider' => in_array($provider, self::PROVIDERS, true) ? $provider : 'none',
            'url' => (string) $this->settings->get('billing.url', ''),
            'identifier' => (string) $this->settings->get('billing.identifier', ''),
            'has_key' => is_string($this->settings->get('billing.key')) && $this->settings->get('billing.key') !== '',
            'has_secret' => is_string($this->settings->get('billing.secret')) && $this->settings->get('billing.secret') !== '',
            'block' => $this->settings->get('billing.block', true) !== false,
            'alert' => $this->settings->get('billing.alert', true) !== false,
        ];
    }

    /**
     * Saves validated settings; an empty key or secret keeps the saved one. Services read before
     * are read again.
     *
     * @param  array{provider: string, url?: ?string, identifier?: ?string, key?: ?string, secret?: ?string, block: bool, alert: bool}  $values
     */
    public function update(array $values): void
    {
        $this->settings->setMany([
            'billing.provider' => $values['provider'],
            'billing.url' => self::base($values['url'] ?? ''),
            'billing.identifier' => trim((string) ($values['identifier'] ?? '')),
            'billing.block' => $values['block'],
            'billing.alert' => $values['alert'],
            'billing.version' => (int) $this->settings->get('billing.version', 0) + 1,
        ]);
        foreach (['key', 'secret'] as $secret) {
            if (is_string($values[$secret] ?? null) && trim($values[$secret]) !== '') {
                $this->settings->setSecret("billing.{$secret}", trim($values[$secret]));
            }
        }
    }

    /**
     * The billing system the settings name, or the one a form names, its empty key or secret
     * standing for the saved one; null for none.
     *
     * @param  array<string, mixed>|null  $values
     */
    public function provider(?array $values = null): ?Provider
    {
        $value = fn (string $key): string => trim((string) ($values[$key] ?? '')) ?: (string) $this->settings->get("billing.{$key}", '');
        $provider = $values === null ? $this->settings()['provider'] : (string) ($values['provider'] ?? 'none');
        $url = self::base($values === null ? (string) $this->settings->get('billing.url', '') : (string) ($values['url'] ?? ''));

        return match ($provider) {
            'paymenter' => new Paymenter($url, $value('key')),
            'whmcs' => new Whmcs($url, $values === null ? (string) $this->settings->get('billing.identifier', '') : trim((string) ($values['identifier'] ?? '')), $value('secret')),
            default => null,
        };
    }

    /** A server's service, or null without a billing system, an external ID or a service by it. @return array<string, mixed>|null */
    public function forServer(Server $server): ?array
    {
        $provider = $this->provider();
        $id = trim((string) $server->external_id);
        if ($provider === null || $id === '') {
            return null;
        }

        $key = sprintf('basalt:billing:%s:%d', $server->uuid, (int) $this->settings->get('billing.version', 0));
        $cached = Cache::get($key);
        if (is_array($cached)) {
            return $cached['value'];
        }

        try {
            $value = $provider->service($id);
            Cache::put($key, ['value' => $value], self::TTL);
        } catch (Throwable $exception) {
            report($exception);
            $value = null;
            Cache::put($key, ['value' => null], self::FAILED_TTL);
        }

        return $value;
    }

    /** A billing system's address without a trailing slash. */
    private static function base(?string $url): string
    {
        return rtrim(trim((string) $url), '/');
    }
}
