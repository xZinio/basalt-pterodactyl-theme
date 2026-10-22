import type { SdkServer } from '@pterodactyl/sdk';
import type { ServerRunState } from '@pterodactyl/sdk/theme';

/** The default allocation as "alias-or-ip:port", or null when the server has none. */
export function primaryAddress(server: SdkServer): string | null {
    const relation = server.attributes.relationships?.allocations;
    const allocations = relation && 'data' in relation ? relation.data : [];
    const allocation = allocations.find((candidate) => candidate.attributes.is_default)?.attributes;
    return allocation ? `${allocation.ip_alias || allocation.ip}:${allocation.port}` : null;
}

/** The fill of a server's status rail. */
export function stateFill(state: ServerRunState | null | undefined): string {
    if (state === 'running') return 'bg-success';
    if (state === 'starting' || state === 'stopping') return 'bg-warning';
    return 'bg-destructive';
}
