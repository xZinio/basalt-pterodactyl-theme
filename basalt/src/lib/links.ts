export type LinkArea = 'all' | 'dashboard' | 'server';

export interface ConfiguredLink {
    readonly label: string;
    readonly url: string;
    readonly icon: string | null;
    /** Where a sidebar link shows: everywhere, on the dashboard and account pages, or on server pages. */
    readonly area: LinkArea;
}

/** Only absolute http(s) links and paths on the panel are followed. */
const safeUrl = (url: string): boolean => /^https?:\/\//i.test(url) || (url.startsWith('/') && !url.startsWith('//'));

const areas: readonly LinkArea[] = ['all', 'dashboard', 'server'];

/**
 * Reads a link list setting: entries separated by commas or new lines, each `Label|URL`, with an
 * optional `|icon` and `|where`. Malformed entries are skipped.
 */
export function parseLinks(value: string | null | undefined): ConfiguredLink[] {
    if (!value) return [];

    return value
        .split(/[,\n]/)
        .map((entry) => entry.split('|').map((part) => part.trim()))
        .filter(([label, url]) => Boolean(label) && Boolean(url) && safeUrl(url))
        .map(([label, url, icon, area]) => ({
            label,
            url,
            icon: icon || null,
            area: areas.includes(area as LinkArea) ? (area as LinkArea) : 'all',
        }));
}

export const isExternal = (url: string): boolean => /^https?:\/\//i.test(url);

/** Attributes that open external links in a new tab. */
export const externalProps = (url: string) => (isExternal(url) ? { target: '_blank', rel: 'noopener noreferrer' } : {});
