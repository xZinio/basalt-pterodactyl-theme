import { createContext } from 'react';

/**
 * The element at the top of the sidebar. The shell renders outside the server's context, so the
 * server layout, which renders inside it, portals the server's block (name, address, power) here.
 */
export const SidebarServerSlot = createContext<HTMLElement | null>(null);

/** Where `server.power` is drawn: icon buttons in the sidebar's server block, or text buttons in a page header. */
export const PowerPlacement = createContext<'header' | 'sidebar'>('header');

/**
 * Where `server.stats` is drawn: the console's tiles, or one of the pieces of the server overview
 * that read the same live model (its usage cards, the banner's summary line, its status rows).
 */
export const StatsPlacement = createContext<'console' | 'cards' | 'summary' | 'facts'>('console');
