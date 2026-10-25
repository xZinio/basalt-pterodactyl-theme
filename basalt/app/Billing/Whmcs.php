<?php

declare(strict_types=1);

namespace Basalt\Billing;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * WHMCS, through its API with an API credential's identifier and secret. A server's external ID
 * is its service ID, as the Pterodactyl module of WHMCS sets it.
 */
final readonly class Whmcs implements Provider
{
    /** WHMCS's billing cycles, as the billing block names them. */
    private const array CYCLES = [
        'monthly' => 'month',
        'quarterly' => '3 months',
        'semi-annually' => '6 months',
        'annually' => 'year',
        'biennially' => '2 years',
        'triennially' => '3 years',
    ];

    /** The most unpaid invoices of the client read for their items. */
    private const int INVOICES = 10;

    public function __construct(private string $url, private string $identifier, private string $secret)
    {
    }

    public function test(): void
    {
        $this->call('GetCurrencies');
    }

    public function service(string $id): ?array
    {
        $products = $this->call('GetClientsProducts', ['serviceid' => $id])['products']['product'] ?? [];
        $service = is_array($products) ? ($products[0] ?? null) : null;
        if (! is_array($service) || (string) ($service['id'] ?? '') !== $id) {
            return null;
        }

        $client = (string) ($service['clientid'] ?? '');
        $details = $this->call('GetClientsDetails', ['clientid' => $client]);
        $currency = $this->currency(is_array($details['client'] ?? null) ? $details['client'] : $details);
        $cycle = strtolower((string) ($service['billingcycle'] ?? ''));

        return [
            'status' => strtolower((string) ($service['status'] ?? '')),
            'plan' => self::text($service['name'] ?? null) ?? self::text($service['groupname'] ?? null),
            'price' => $cycle === 'free account' ? '0' : self::text($service['recurringamount'] ?? null),
            'currency' => self::text($currency['code'] ?? null),
            'prefix' => self::affix($currency['prefix'] ?? null),
            'suffix' => self::affix($currency['suffix'] ?? null),
            'cycle' => self::CYCLES[$cycle] ?? null,
            'due_at' => self::date($service['nextduedate'] ?? null),
            'url' => "{$this->url}/clientarea.php?action=productdetails&id={$id}",
            'upgrade_url' => "{$this->url}/upgrade.php?type=package&id={$id}",
            'unpaid' => $this->unpaid($client, $id),
        ];
    }

    /**
     * The client's currency as WHMCS writes amounts in it: the client details name it by ID and
     * code, and the currencies list has its prefix and suffix.
     *
     * @param  array<string, mixed>  $client
     * @return array{code: mixed, prefix: mixed, suffix: mixed}
     */
    private function currency(array $client): array
    {
        $currencies = $this->call('GetCurrencies')['currencies']['currency'] ?? [];
        foreach (is_array($currencies) ? $currencies : [] as $currency) {
            if (is_array($currency) && ((isset($client['currency']) && (string) ($currency['id'] ?? '') === (string) $client['currency']) || (isset($client['currency_code']) && ($currency['code'] ?? null) === $client['currency_code']))) {
                return ['code' => $currency['code'] ?? null, 'prefix' => $currency['prefix'] ?? null, 'suffix' => $currency['suffix'] ?? null];
            }
        }

        return ['code' => $client['currency_code'] ?? null, 'prefix' => $client['currency_prefix'] ?? null, 'suffix' => $client['currency_suffix'] ?? null];
    }

    /** @return list<array{id: string, url: string, due_at: ?string}> */
    private function unpaid(string $client, string $id): array
    {
        $invoices = $this->call('GetInvoices', ['userid' => $client, 'status' => 'Unpaid', 'orderby' => 'duedate', 'order' => 'asc', 'limitnum' => 25])['invoices']['invoice'] ?? [];
        $unpaid = [];
        foreach (array_slice(is_array($invoices) ? $invoices : [], 0, self::INVOICES) as $invoice) {
            $number = (string) ($invoice['id'] ?? '');
            $items = $this->call('GetInvoice', ['invoiceid' => $number])['items']['item'] ?? [];
            foreach (is_array($items) ? $items : [] as $item) {
                if (strcasecmp((string) ($item['type'] ?? ''), 'Hosting') === 0 && (string) ($item['relid'] ?? '') === $id) {
                    $unpaid[] = ['id' => $number, 'url' => "{$this->url}/viewinvoice.php?id={$number}", 'due_at' => self::date($invoice['duedate'] ?? null)];
                    break;
                }
            }
        }

        return $unpaid;
    }

    /**
     * @param  array<string, mixed>  $parameters
     * @return array<string, mixed>
     */
    private function call(string $action, array $parameters = []): array
    {
        try {
            $response = Http::asForm()->acceptJson()->timeout(8)->post("{$this->url}/includes/api.php", [
                ...$parameters,
                'action' => $action,
                'identifier' => $this->identifier,
                'secret' => $this->secret,
                'responsetype' => 'json',
            ]);
        } catch (ConnectionException) {
            throw new BillingException('WHMCS could not be reached at this URL.');
        }

        $json = $response->json();
        if (! is_array($json) || ($json['result'] ?? null) !== 'success') {
            $message = is_array($json) && is_string($json['message'] ?? null) ? $json['message'] : "WHMCS answered with HTTP {$response->status()}.";
            throw new BillingException($message);
        }

        return $json;
    }

    private static function text(mixed $value): ?string
    {
        return is_scalar($value) && trim((string) $value) !== '' ? trim((string) $value) : null;
    }

    /** A currency's prefix or suffix as WHMCS writes it, spaces and all, such as " USD". */
    private static function affix(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? $value : null;
    }

    /** A date as YYYY-MM-DD, or null for none (WHMCS writes 0000-00-00). */
    private static function date(mixed $value): ?string
    {
        return is_string($value) && preg_match('/^(\d{4}-\d{2}-\d{2})/', $value, $match) === 1 && $match[1] !== '0000-00-00' ? $match[1] : null;
    }
}
