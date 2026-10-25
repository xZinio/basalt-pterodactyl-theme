<?php

declare(strict_types=1);

namespace Basalt\Http;

use Basalt\Billing\Billing;
use Basalt\Billing\BillingException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The billing system: its settings and a test of them for the studio, and the services of servers
 * for their owners. Subusers never see a server's billing.
 */
final class BillingController
{
    public function __construct(private readonly Billing $billing)
    {
    }

    public function show(): JsonResponse
    {
        return new JsonResponse(['billing' => $this->billing->settings()]);
    }

    public function update(Request $request): JsonResponse
    {
        $this->billing->update($this->validated($request));

        return new JsonResponse(['billing' => $this->billing->settings()]);
    }

    /** Tries the settings of the form, its empty key or secret standing for the saved one. */
    public function test(Request $request): JsonResponse
    {
        $provider = $this->billing->provider($this->validated($request));
        if ($provider === null) {
            return new JsonResponse(['ok' => false, 'message' => 'Choose a billing system first.']);
        }

        try {
            $provider->test();
        } catch (BillingException $exception) {
            return new JsonResponse(['ok' => false, 'message' => $exception->getMessage()]);
        }

        return new JsonResponse(['ok' => true, 'message' => 'Connected.']);
    }

    /** The services of the named servers the user owns, by UUID; null for a server without one. */
    public function servers(Request $request): JsonResponse
    {
        $settings = $this->billing->settings();
        $user = $request->user();
        $servers = [];
        if ($settings['provider'] !== 'none') {
            foreach (AccessibleServers::fromRequest($request, 50) as $server) {
                if ($user->root_admin || (int) $server->owner_id === (int) $user->id) {
                    $servers[$server->uuid] = $this->billing->forServer($server);
                }
            }
        }

        return new JsonResponse([
            'settings' => ['enabled' => $settings['provider'] !== 'none', 'block' => $settings['block'], 'alert' => $settings['alert']],
            'servers' => (object) $servers,
        ]);
    }

    /** @return array{provider: string, url?: ?string, identifier?: ?string, key?: ?string, secret?: ?string, block: bool, alert: bool} */
    private function validated(Request $request): array
    {
        return $request->validate([
            'provider' => ['required', 'in:'.implode(',', Billing::PROVIDERS)],
            'url' => ['nullable', 'required_unless:provider,none', 'string', 'max:255', 'regex:#^https?://[^\s/?\#]+(/[^\s?\#]*)?$#i'],
            'identifier' => ['nullable', 'required_if:provider,whmcs', 'string', 'max:255'],
            'key' => ['nullable', 'string', 'max:500'],
            'secret' => ['nullable', 'string', 'max:500'],
            'block' => ['required', 'boolean'],
            'alert' => ['required', 'boolean'],
        ]);
    }
}
