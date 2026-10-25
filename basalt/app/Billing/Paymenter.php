<?php

declare(strict_types=1);

namespace Basalt\Billing;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Paymenter, through its admin API with an API key that may view services, products and invoices.
 * A server's external ID is its service ID, as the Pterodactyl extension of Paymenter sets it.
 * Its resources come as JSON:API documents; an include the key may not view is refused with HTTP 400.
 */
final readonly class Paymenter implements Provider
{
    /** The most unpaid invoices listed for a service. */
    private const int INVOICES = 10;

    public function __construct(private string $url, private string $key)
    {
    }

    public function test(): void
    {
        $this->get('services', ['per_page' => 1]);
        if ($this->get('services', ['per_page' => 1, 'include' => 'product,invoices'], allow: [400]) === null) {
            throw new BillingException('The API key may view services, but not products or invoices. Give it the View Products and View Invoices permissions too.');
        }
    }

    public function service(string $id): ?array
    {
        // Without the products and invoices permissions, the service alone still has its status, price and due date.
        $document = $this->get("services/{$id}", ['include' => 'product,invoices'], allow: [400, 404])
            ?? $this->get("services/{$id}", allow: [404]);
        if ($document === null || ! is_array($document['data'] ?? null)) {
            return null;
        }

        $service = self::attributes($document['data']);
        $product = self::related($document, $document['data'], 'product')[0] ?? null;
        $plan = $product === null ? null : $this->plan((string) ($product['id'] ?? ''), $service);
        $period = (int) ($plan['billing_period'] ?? 1);
        $unit = is_string($plan['billing_unit'] ?? null) ? $plan['billing_unit'] : null;

        return [
            'status' => strtolower((string) ($service['status'] ?? '')),
            'plan' => self::text(self::attributes($product)['name'] ?? null) ?? self::text($plan['name'] ?? null),
            'price' => ($plan['type'] ?? null) === 'free' ? '0' : self::text($service['price'] ?? null),
            'currency' => self::text($service['currency_code'] ?? null),
            'prefix' => null,
            'suffix' => null,
            'cycle' => $unit === null || ($plan['type'] ?? null) !== 'recurring' ? null : ($period > 1 ? "{$period} {$unit}s" : $unit),
            'due_at' => self::date($service['expires_at'] ?? null),
            'url' => "{$this->url}/services/{$id}",
            'upgrade_url' => "{$this->url}/services/{$id}/upgrade",
            'unpaid' => $this->unpaid($document),
        ];
    }

    /**
     * The plan of the product the service is on, which the API does not name: the product's only
     * plan, or the one whose price in the service's currency is the service's price.
     *
     * @param  array<string, mixed>  $service
     * @return array<string, mixed>|null
     */
    private function plan(string $product, array $service): ?array
    {
        $document = $product === '' ? null : $this->get("products/{$product}", ['include' => 'plans.prices'], allow: [400, 404]);
        $plans = $document === null || ! is_array($document['data'] ?? null) ? [] : self::related($document, $document['data'], 'plans');
        if (count($plans) === 1) {
            return self::attributes($plans[0]);
        }

        $matching = array_values(array_filter($plans, function (array $plan) use ($document, $service): bool {
            foreach (self::related($document, $plan, 'prices') as $price) {
                $price = self::attributes($price);
                if (($price['currency_code'] ?? null) === ($service['currency_code'] ?? null) && is_numeric($price['price'] ?? null) && is_numeric($service['price'] ?? null) && (float) $price['price'] === (float) $service['price']) {
                    return true;
                }
            }

            return false;
        }));

        return count($matching) === 1 ? self::attributes($matching[0]) : null;
    }

    /**
     * The service's pending invoices, from the invoices included with it.
     *
     * @param  array<string, mixed>  $document
     * @return list<array{id: string, url: string, due_at: ?string}>
     */
    private function unpaid(array $document): array
    {
        $unpaid = [];
        foreach (self::related($document, $document['data'], 'invoices') as $resource) {
            $invoice = self::attributes($resource);
            if (($invoice['status'] ?? null) !== 'pending') {
                continue;
            }

            $number = (string) ($resource['id'] ?? '');
            $unpaid[] = ['id' => $number, 'url' => "{$this->url}/invoices/{$number}", 'due_at' => self::date($invoice['due_at'] ?? null)];
        }

        usort($unpaid, fn (array $a, array $b): int => strcmp((string) $a['due_at'], (string) $b['due_at']));

        return array_slice($unpaid, 0, self::INVOICES);
    }

    /**
     * @param  array<string, scalar>  $query
     * @param  list<int>  $allow  statuses that mean there is nothing to read, for which null is returned
     * @return array<string, mixed>|null
     */
    private function get(string $path, array $query = [], array $allow = []): ?array
    {
        try {
            $response = Http::withToken($this->key)->acceptJson()->timeout(8)->get("{$this->url}/api/v1/admin/{$path}", $query);
        } catch (ConnectionException) {
            throw new BillingException('Paymenter could not be reached at this URL.');
        }

        if (in_array($response->status(), $allow, true)) {
            return null;
        }
        if (in_array($response->status(), [401, 403], true)) {
            throw new BillingException('Paymenter refused the API key, or it may not view services. Check that it is an admin key, its permissions and its allowed IP addresses.');
        }

        $json = $response->json();
        if (! $response->successful() || ! is_array($json)) {
            throw new BillingException("Paymenter answered with HTTP {$response->status()}.");
        }

        return $json;
    }

    /**
     * The included resources a resource's relationship points to, in its order.
     *
     * @param  array<string, mixed>  $document
     * @param  array<string, mixed>  $resource
     * @return list<array<string, mixed>>
     */
    private static function related(array $document, array $resource, string $relation): array
    {
        $links = $resource['relationships'][$relation]['data'] ?? null;
        if (! is_array($links)) {
            return [];
        }

        $included = [];
        foreach (is_array($document['included'] ?? null) ? $document['included'] : [] as $item) {
            if (is_array($item)) {
                $included[($item['type'] ?? '').':'.($item['id'] ?? '')] = $item;
            }
        }

        $found = [];
        foreach (array_is_list($links) ? $links : [$links] as $link) {
            $item = is_array($link) ? ($included[($link['type'] ?? '').':'.($link['id'] ?? '')] ?? null) : null;
            if ($item !== null) {
                $found[] = $item;
            }
        }

        return $found;
    }

    /** A JSON:API resource's attributes. @return array<string, mixed> */
    private static function attributes(mixed $resource): array
    {
        return is_array($resource) && is_array($resource['attributes'] ?? null) ? $resource['attributes'] : [];
    }

    private static function text(mixed $value): ?string
    {
        return is_scalar($value) && trim((string) $value) !== '' ? trim((string) $value) : null;
    }

    /** A date as YYYY-MM-DD, from the ISO time Paymenter writes, or null for none. */
    private static function date(mixed $value): ?string
    {
        return is_string($value) && preg_match('/^(\d{4}-\d{2}-\d{2})/', $value, $match) === 1 ? $match[1] : null;
    }
}
