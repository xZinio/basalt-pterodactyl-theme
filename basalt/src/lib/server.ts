import type { PanelDestination, SdkServer } from '@pterodactyl/sdk';
import { useThemeSettings, type ServerRunState } from '@pterodactyl/sdk/theme';
import type { ThemeSettings } from '../theme-types';

/** The default allocation as "alias-or-ip:port", or null when the server has none. */
export function primaryAddress(server: SdkServer): string | null {
    const relation = server.attributes.relationships?.allocations;
    const allocations = relation && 'data' in relation ? relation.data : [];
    const allocation = allocations.find((candidate) => candidate.attributes.is_default)?.attributes;
    return allocation ? `${allocation.ip_alias || allocation.ip}:${allocation.port}` : null;
}

/** The fill of a server's status rail or dot: grey while its state is unknown. */
export function stateFill(state: ServerRunState | null | undefined): string {
    if (state === 'running') return 'bg-success';
    if (state === 'starting' || state === 'stopping') return 'bg-warning';
    if (state === 'offline') return 'bg-destructive';
    return 'bg-muted-foreground';
}

/**
 * Whether a server opens on its dashboard, with the console on a page of its own. It is also the
 * console screen's `visible` predicate, so the screen exists only while the dashboard is on.
 */
export const useServerDashboard = (): boolean => useThemeSettings<Partial<ThemeSettings>>().serverDashboard !== false;

/** A server's dashboard, or its console when the dashboard is off: the server's first page. */
export const serverDestination = (identifier: string): PanelDestination => ({ to: '/server/$id', params: { id: identifier } });

/**
 * A server's console: its own page beside the dashboard, or the server's first page without one. The
 * console screen is linked by its path rather than its id, so a link never throws where the screen
 * is not registered, such as in a test or beside another extension that claims the same path.
 */
export const consoleDestination = (identifier: string, dashboard: boolean): PanelDestination =>
    dashboard ? ({ to: '/server/$id/console', params: { id: identifier } } as unknown as PanelDestination) : serverDestination(identifier);

/** The path of the console screen, which shows the console that the server's first page keeps mounted. */
export const isConsolePath = (pathname: string): boolean => /^\/server\/[^/]+\/console\/?$/.test(pathname);
