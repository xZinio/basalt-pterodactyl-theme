import type { SdkServer } from '@pterodactyl/sdk';
import { safeUrl } from './links';

export type NoticeType = 'info' | 'success' | 'warning' | 'danger';

/** A message at the top of pages, as users get it: one that shows now. */
export interface Announcement {
    readonly id: string;
    readonly title: string | null;
    readonly body: string | null;
    readonly type: NoticeType;
    readonly style: 'banner' | 'card' | 'minimal';
    readonly placement: 'everywhere' | 'dashboard' | 'server';
    /** The nodes and eggs it is aimed at; with any, it shows only on the pages of their servers. */
    readonly nodes: readonly number[];
    readonly eggs: readonly number[];
    readonly dismissible: boolean;
    readonly buttonLabel: string | null;
    readonly buttonUrl: string | null;
}

/** A link in the sidebar. */
export interface ContentLink {
    readonly id: string;
    readonly label: string;
    readonly url: string;
    readonly icon: string | null;
    readonly area: 'everywhere' | 'dashboard' | 'account' | 'server';
    readonly newTab: boolean;
}

export const QUICK_ACTIONS = ['console', 'files', 'backups', 'databases', 'schedules', 'network', 'startup', 'settings', 'url', 'upgrade'] as const;

/** A shortcut on the server cards, and among the dashboard's quick actions when it is a link. */
export interface QuickAction {
    readonly id: string;
    readonly action: (typeof QUICK_ACTIONS)[number];
    readonly label: string;
    readonly icon: string | null;
    readonly url: string | null;
}

/** What administrators write for every user's pages. */
export interface Content {
    readonly announcements: readonly Announcement[];
    readonly links: readonly ContentLink[];
    readonly quickActions: readonly QuickAction[];
    readonly players: { readonly cards: boolean; readonly dashboard: boolean };
    readonly locations: { readonly dashboard: boolean };
}

/** Until the content arrives: nothing, but the quick actions the panel starts with. */
export const emptyContent: Content = {
    announcements: [],
    links: [],
    quickActions: [
        { id: 'console', action: 'console', label: 'Console', icon: 'square-terminal', url: null },
        { id: 'files', action: 'files', label: 'Files', icon: 'folder', url: null },
        { id: 'backups', action: 'backups', label: 'Backups', icon: 'archive', url: null },
    ],
    players: { cards: true, dashboard: true },
    locations: { dashboard: true },
};

/** A server's values for the placeholders of links. */
export type LinkValues = Readonly<Record<'id' | 'uuid' | 'name' | 'ip' | 'port', string>>;

export function linkValues(server: SdkServer): LinkValues {
    const { attributes } = server;
    const relation = attributes.relationships?.allocations;
    const allocations = relation && 'data' in relation ? relation.data : [];
    const allocation = (allocations.find((candidate) => candidate.attributes.is_default) ?? allocations[0])?.attributes;

    return {
        id: attributes.identifier,
        uuid: attributes.uuid,
        name: attributes.name,
        ip: allocation ? allocation.ip_alias || allocation.ip : '',
        port: allocation ? String(allocation.port) : '',
    };
}

const placeholders = /\{(id|uuid|name|ip|port)\}/g;
const placeholder = /\{(id|uuid|name|ip|port)\}/;

/**
 * A link with {id}, {uuid}, {name}, {ip} and {port} filled in from a server, or null when it holds
 * one without a server to fill it from, or is not a link Basalt follows.
 */
export function fillLink(url: string, values: LinkValues | null): string | null {
    const filled = url.trim().replace(placeholders, (match, key: keyof LinkValues) => (values ? encodeURIComponent(values[key]) : match));
    return placeholder.test(filled) || !safeUrl(filled) ? null : filled;
}
