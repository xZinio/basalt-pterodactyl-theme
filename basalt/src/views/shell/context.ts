import { createContext } from 'react';

/**
 * The element at the top of the sidebar. The shell renders outside the server's context, so the
 * server layout, which renders inside it, portals the server's block (name, address, power) here.
 */
export const SidebarServerSlot = createContext<HTMLElement | null>(null);

/** Where `server.power` is drawn: icon buttons in the sidebar's server block, or text buttons in a page header. */
export const PowerPlacement = createContext<'header' | 'sidebar'>('header');

/**
 * Where `server.stats` is drawn: the console's tiles, or one of the pieces of the server's
 * dashboard that read the same live model (its stat tiles, the banner's summary line, a row of
 * its server information).
 */
export const StatsPlacement = createContext<'console' | 'cards' | 'summary' | 'facts'>('console');

/** What the dashboard's live pieces show: the stat tiles of a block, or the one information row. */
export const StatsItems = createContext<readonly string[]>(['cpu', 'memory', 'disk', 'address']);

/** What the dashboard knows that the live model does not: the server's node, its players while it runs Minecraft, and its suspension. */
export const DashboardServer = createContext<{
    readonly node: string;
    readonly players: { readonly online: number; readonly max: number } | null;
    readonly suspended: boolean;
}>({ node: '', players: null, suspended: false });
