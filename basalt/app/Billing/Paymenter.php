<?php

declare(strict_types=1);

namespace Basalt\Billing;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Paymenter, through its admin API with an API key that may view services, products and invoices.
 * A server's external ID is its service ID, as the Pterodactyl extension of Paymenter sets it.
 * Its resources come as JSON:API documents, with the service's product and plan included.
 */
final readonly class Paymenter implements Provider
{
    public function __construct(private string $url, private string $key)
    {
    }

    public function test(): void
    {
        $this->get('services', ['page[size]' => 1]);
    }

    public function service(string $id): ?array
    {
        $document = $this->get("services/{$id}", ['include' => 'product,plan'], missing: true);
        if ($document === null || ! is_array($document['data'] ?? null)) {
            return null;
        }

        $service = self::attributes($document['data']);
        $product = self::included($document, 'product');
        $plan = self::included($document, 'plan');
        $free = ($plan['type'] ?? null) === 'free';
        $period = (int) ($plan['billing_period'] ?? 1);
        $unit = is_string($plan['billing_unit'] ?? null) ? $plan['billing_unit'] : null;

        return [
            'status' => strtolower((string) ($service['status'] ?? '')),
            'plan' => self::text($product['name'] ?? null) ?? self::text($plan['name'] ?? null),
            'price' => $free ? '0' : self::text($service['price'] ?? null),
            'currency' => self::text($service['currency_code'] ?? null),
            'prefix' => null,
            'suffix' => null,
            'cycle' => $unit === null || ($plan['type'] ?? 'recurring') !== 'recurring' ? null : ($period > 1 ? "{$period} {$unit}s" : $unit),
            'due_at' => is_string($service['expires_at'] ?? null) && preg_match('/^\d{4}-\d{2}-\d{2}/', $service['expires_at']) === 1 ? substr($service['expires_at'], 0, 10) : null,
            'url' => "{$this->url}/services/{$id}",
            'upgrade_url' => "{$this->url}/services/{$id}/upgrade",
            'unpaid' => $this->unpaid((string) ($service['user_id'] ?? ''), $id),
        ];
    }

    /** @return list<array{id: string, url: string, due_at: ?string}> */
    private function unpaid(string $user, string $id): array
    {
        $document = $this->get('invoices', array_filter(['filter[status]' => 'pending', 'filter[user_id]' => $user, 'include' => 'items', 'page[size]' => 25]));
        $items = [];
        foreach ($document['included'] ?? [] as $resource) {
            if (is_array($resource) && str_contains((string) ($resource['type'] ?? ''), 'item')) {
                $items[(string) ($resource['id'] ?? '')] = self::attributes($resource);
            }
        }

        $unpaid = [];
        foreach (is_array($document['data'] ?? null) ? $document['data'] : [] as $resource) {
            $invoice = self::attributes($resource);
            $number = (string) ($resource['id'] ?? $invoice['id'] ?? '');
            $references = array_map(fn (array $link): string => (string) ($link['id'] ?? ''), $resource['relationships']['items']['data'] ?? []);
            $lines = array_map(fn (string $key): array => $items[$key] ?? [], $references);
            foreach ($lines as $line) {
                if (str_contains(strtolower((string) ($line['reference_type'] ?? '')), 'service') && (string) ($line['reference_id'] ?? '') === $id) {
                    $unpaid[] = [
                        'id' => $number,
                        'url' => "{$this->url}/invoices/{$number}",
                        'due_at' => is_string($invoice['due_at'] ?? null) ? substr($invoice['due_at'], 0, 10) : null,
                    ];
                    break;
                }
            }
        }

        return $unpaid;
    }

    /**
     * @param  array<string, scalar>  $query
     * @return array<string, mixed>|null null for a resource Paymenter does not have, when that may be
     */
    private function get(string $path, array $query = [], bool $missing = false): ?array
    {
        try {
            $response = Http::withToken($this->key)->acceptJson()->timeout(8)->get("{$this->url}/api/v1/admin/{$path}", $query);
        } catch (ConnectionException) {
            throw new BillingException('Paymenter could not be reached at this URL.');
        }

        if ($missing && $response->status() === 404) {
            return null;
        }
        if (in_array($response->status(), [401, 403], true)) {
            throw new BillingException('Paymenter refused the API key, or it may not view services, products and invoices.');
        }

        $json = $response->json();
        if (! $response->successful() || ! is_array($json)) {
            throw new BillingException("Paymenter answered with HTTP {$response->status()}.");
        }

        return $json;
    }

    /** A JSON:API resource's attributes, or the resource itself when it is a plain object. @return array<string, mixed> */
    private static function attributes(mixed $resource): array
    {
        if (! is_array($resource)) {
            return [];
        }

        return is_array($resource['attributes'] ?? null) ? [...$resource['attributes'], 'id' => $resource['id'] ?? null] : $resource;
    }

    /** The included resource a service's relationship names. @param array<string, mixed> $document @return array<string, mixed> */
    private static function included(array $document, string $relation): array
    {
        $link = $document['data']['relationships'][$relation]['data'] ?? null;
        foreach ($document['included'] ?? [] as $resource) {
            if (is_array($link) && is_array($resource) && (string) ($resource['id'] ?? '') === (string) ($link['id'] ?? '') && ($resource['type'] ?? null) === ($link['type'] ?? null)) {
                return self::attributes($resource);
            }
        }

        // A plain document may nest them instead.
        return is_array($document['data'][$relation] ?? null) ? $document['data'][$relation] : [];
    }

    private static function text(mixed $value): ?string
    {
        return is_scalar($value) && trim((string) $value) !== '' ? trim((string) $value) : null;
    }
}
