<?php

declare(strict_types=1);

namespace Basalt\Billing;

/**
 * A billing system that sells the servers: it finds a server's service by the ID its Pterodactyl
 * module gives the server as its external ID.
 */
interface Provider
{
    /** Checks that the system answers with these credentials; throws a BillingException saying why not. */
    public function test(): void;

    /**
     * The service with an ID, or null when the system has none: its status, plan, price, billing
     * cycle and next due date, its unpaid invoices, and the addresses where its owner manages,
     * upgrades and pays for it.
     *
     * @return array{status: string, plan: ?string, price: ?string, currency: ?string, prefix: ?string, suffix: ?string, cycle: ?string, due_at: ?string, url: string, upgrade_url: ?string, unpaid: list<array{id: string, url: string, due_at: ?string}>}|null
     */
    public function service(string $id): ?array;
}
