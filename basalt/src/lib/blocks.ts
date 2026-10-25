/** The blocks a server's dashboard is built of, in the order the studio offers them. */
export const BLOCK_TYPES = ['header', 'banner', 'stats', 'graphs', 'info', 'actions', 'sftp', 'billing', 'notes', 'notice'] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

/** How much of the dashboard's width a block takes; below 700px every block takes all of it. */
export const BLOCK_WIDTHS = ['full', 'twothirds', 'half', 'third'] as const;
export type BlockWidth = (typeof BLOCK_WIDTHS)[number];

export const STAT_ITEMS = ['cpu', 'memory', 'disk', 'address', 'uptime', 'network', 'players'] as const;
export const INFO_ITEMS = ['status', 'uptime', 'address', 'node', 'location', 'id', 'uuid', 'image', 'limits'] as const;
export const ACTION_ITEMS = ['console', 'files', 'databases', 'backups', 'schedules', 'network', 'startup', 'settings', 'custom'] as const;

export type BannerHeight = 'small' | 'medium' | 'large';
export type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

export interface Block {
    readonly id: string;
    readonly type: BlockType;
    readonly width: BlockWidth;
    /** The stat tiles, information rows or shortcuts it shows, in their order. */
    readonly items?: readonly string[];
    readonly height?: BannerHeight;
    readonly title?: string;
    readonly text?: string;
    readonly tone?: NoticeTone;
}

/** The most blocks a dashboard holds. */
export const MAX_BLOCKS = 30;

/** The items a block of a type can show, or null for a block without items. */
export const itemsOf = (type: BlockType): readonly string[] | null =>
    type === 'stats' ? STAT_ITEMS : type === 'info' ? INFO_ITEMS : type === 'actions' ? ACTION_ITEMS : null;

/** A new block of a type, as the studio adds it. */
export function newBlock(type: BlockType): Block {
    const id = `${type}-${Math.random().toString(36).slice(2, 8)}`;
    switch (type) {
        case 'banner':
            return { id, type, width: 'full', height: 'medium' };
        case 'stats':
            return { id, type, width: 'full', items: ['cpu', 'memory', 'disk', 'address'] };
        case 'info':
            return { id, type, width: 'half', items: ['status', 'uptime', 'node', 'location', 'id', 'uuid', 'image', 'limits'] };
        case 'actions':
            return { id, type, width: 'half', items: [...ACTION_ITEMS] };
        case 'notice':
            return { id, type, width: 'full', title: 'Need help?', text: 'Open a ticket on our support page and we will get back to you.', tone: 'info' };
        case 'sftp':
        case 'billing':
        case 'notes':
            return { id, type, width: 'half' };
        default:
            return { id, type, width: 'full' };
    }
}

/** The dashboard until the administrator builds their own. */
export const defaultLayout: readonly Block[] = [
    { id: 'header', type: 'header', width: 'full' },
    { id: 'banner', type: 'banner', width: 'full', height: 'medium' },
    { id: 'stats', type: 'stats', width: 'full', items: ['cpu', 'memory', 'disk', 'address'] },
    { id: 'graphs', type: 'graphs', width: 'full' },
    { id: 'info', type: 'info', width: 'half', items: ['status', 'uptime', 'node', 'location', 'id', 'uuid', 'image', 'limits'] },
    { id: 'actions', type: 'actions', width: 'half', items: [...ACTION_ITEMS] },
    { id: 'sftp', type: 'sftp', width: 'half' },
    { id: 'billing', type: 'billing', width: 'half' },
];

const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined => (allowed.includes(value as T) ? (value as T) : undefined);
const text = (value: unknown, max: number): string | undefined => (typeof value === 'string' ? value.slice(0, max) : undefined);

/**
 * The Layout setting, read leniently: blocks of unknown types are left out, and anything else
 * that does not parse gives the default dashboard.
 */
export function parseLayout(value: unknown): Block[] {
    if (typeof value !== 'string' || value.trim() === '') return [...defaultLayout];

    let parsed: unknown;
    try {
        parsed = JSON.parse(value);
    } catch {
        return [...defaultLayout];
    }
    if (!Array.isArray(parsed)) return [...defaultLayout];

    const ids = new Set<string>();
    return parsed.slice(0, MAX_BLOCKS).flatMap((raw): Block[] => {
        if (!raw || typeof raw !== 'object') return [];
        const entry = raw as Record<string, unknown>;
        const type = oneOf(entry.type, BLOCK_TYPES);
        if (!type) return [];

        let id = typeof entry.id === 'string' && /^[\w-]{1,40}$/.test(entry.id) ? entry.id : `${type}-${ids.size}`;
        if (ids.has(id)) id = `${id}-${ids.size}`;
        ids.add(id);

        const allowed = itemsOf(type);
        const items = allowed && Array.isArray(entry.items) ? entry.items.filter((item): item is string => typeof item === 'string' && allowed.includes(item)) : undefined;

        return [
            {
                id,
                type,
                width: oneOf(entry.width, BLOCK_WIDTHS) ?? 'full',
                items: allowed ? (items ?? newBlock(type).items) : undefined,
                height: type === 'banner' ? (oneOf(entry.height, ['small', 'medium', 'large'] as const) ?? 'medium') : undefined,
                title: type === 'notice' ? (text(entry.title, 120) ?? '') : undefined,
                text: type === 'notice' ? (text(entry.text, 600) ?? '') : undefined,
                tone: type === 'notice' ? (oneOf(entry.tone, ['info', 'success', 'warning', 'danger'] as const) ?? 'info') : undefined,
            },
        ];
    });
}

/** The setting's value: each block without its empty fields. */
export const serializeLayout = (blocks: readonly Block[]): string =>
    JSON.stringify(blocks.map((block) => Object.fromEntries(Object.entries(block).filter(([, value]) => value !== undefined))));
