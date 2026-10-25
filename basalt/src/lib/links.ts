import { useCallback, type MouseEvent } from 'react';
import { usePanelNavigate, type PanelDestination } from '@pterodactyl/sdk';

/** A link of a link list setting. */
export interface ConfiguredLink {
    readonly label: string;
    readonly url: string;
}

/** Only absolute http(s) links and paths on the panel are followed. */
export const safeUrl = (url: string): boolean => /^https?:\/\//i.test(url) || (url.startsWith('/') && !url.startsWith('//'));

/** Reads a link list setting: `Label|URL` entries separated by commas or new lines. Malformed entries are skipped. */
export function parseLinks(value: string | null | undefined): ConfiguredLink[] {
    if (!value) return [];

    return value
        .split(/[,\n]/)
        .map((entry) => entry.split('|').map((part) => part.trim()))
        .filter(([label, url]) => Boolean(label) && Boolean(url) && safeUrl(url))
        .map(([label, url]) => ({ label, url }));
}

export const isExternal = (url: string): boolean => /^https?:\/\//i.test(url);

/** Attributes that open external links in a new tab. */
export const externalProps = (url: string) => (isExternal(url) ? { target: '_blank', rel: 'noopener noreferrer' } : {});

/** A path on the panel, with its query and hash, as the panel's router takes it. */
export function destinationOf(href: string): PanelDestination {
    const url = new URL(href, window.location.origin);
    // A concrete path: the router takes it as it is, without parameters to fill in.
    return { to: url.pathname, search: Object.fromEntries(url.searchParams), hash: url.hash.slice(1) || undefined } as unknown as PanelDestination;
}

/**
 * A link's click handler for an address an administrator wrote: a path on the panel opens like the
 * panel's own links, without reloading the page, unless a modifier key asks for a new tab.
 */
export function useFollow(): (event: MouseEvent<HTMLAnchorElement>, href: string) => void {
    const navigate = usePanelNavigate();

    return useCallback(
        (event, href) => {
            if (isExternal(href) || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
            event.preventDefault();
            void navigate(destinationOf(href));
        },
        [navigate]
    );
}
