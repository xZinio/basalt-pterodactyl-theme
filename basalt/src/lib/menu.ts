import type { NavItem } from '@pterodactyl/sdk/theme';

/** The groups of the server menu, in their order down the sidebar. */
export const MENU_GROUPS = ['General', 'Files and data', 'Game', 'Extensions'] as const;
export type MenuGroup = (typeof MENU_GROUPS)[number];

/** The menus the Menu items setting changes. */
export type MenuArea = 'server' | 'account';

/** An administrator's change to one item: its label, its icon, its group, or hiding it. Its place is its order. */
export interface MenuEntry {
    readonly key: string;
    readonly label?: string;
    readonly icon?: string;
    readonly hidden?: true;
    readonly group?: MenuGroup;
}

export type MenuConfig = Readonly<Record<MenuArea, readonly MenuEntry[]>>;

/** An item as the menu shows it: the administrator's label, icon and group over its own. */
export interface MenuRow {
    readonly item: NavItem;
    readonly key: string;
    readonly label: string;
    readonly icon: string;
    readonly group: MenuGroup;
    readonly hidden: boolean;
    readonly entry?: MenuEntry;
    /** What it shows while the administrator has changed nothing. */
    readonly original: { readonly label: string; readonly icon: string; readonly group: MenuGroup };
}

/** What the studio's preview tells the studio about a menu: its items as the panel names them. */
export interface KnownItem {
    readonly key: string;
    readonly label: string;
    readonly icon: string;
    readonly group: MenuGroup;
}

/** The message a preview frame sends the studio with a menu's items. */
export const MENU_MESSAGE = 'basalt-menu';

/** An item's key in the setting: its extension, if any, and its id. */
export const menuKey = (item: Pick<NavItem, 'id' | 'extensionId'>): string => `${item.extensionId ?? ''}:${item.id}`;

const groupsByName: Readonly<Record<string, MenuGroup>> = {
    index: 'General',
    dashboard: 'General',
    console: 'General',
    users: 'General',
    network: 'General',
    startup: 'General',
    settings: 'General',
    activity: 'General',
    files: 'Files and data',
    databases: 'Files and data',
    schedules: 'Files and data',
    backups: 'Files and data',
    players: 'Game',
    properties: 'Game',
    plugins: 'Game',
    mods: 'Game',
    versions: 'Game',
    modpacks: 'Game',
    worlds: 'Game',
};

/** The group an item takes until it is moved: by its id or label, else extensions' items on their own. */
export function defaultGroup(item: Pick<NavItem, 'id' | 'label' | 'extensionId'>): MenuGroup {
    for (const name of [item.id, item.label].map((value) => value.toLowerCase().replace(/[^a-z]+/g, ''))) {
        if (groupsByName[name]) return groupsByName[name];
    }
    return item.extensionId ? 'Extensions' : 'General';
}

const text = (value: unknown, max: number): string | undefined =>
    typeof value === 'string' && value.trim() !== '' ? value.trim().slice(0, max) : undefined;

const isGroup = (value: unknown): value is MenuGroup => MENU_GROUPS.includes(value as MenuGroup);

function parseEntries(value: unknown): MenuEntry[] {
    if (!Array.isArray(value)) return [];

    const seen = new Set<string>();
    return value.flatMap((raw): MenuEntry[] => {
        if (!raw || typeof raw !== 'object') return [];
        const { key, label, icon, hidden, group } = raw as Record<string, unknown>;
        const id = text(key, 200);
        if (!id || seen.has(id)) return [];
        seen.add(id);

        const name = text(group, 40);
        return [
            {
                key: id,
                label: text(label, 60),
                icon: text(icon, 60),
                hidden: hidden === true || undefined,
                group: isGroup(name) ? name : undefined,
            },
        ];
    });
}

/** The Menu items setting, read leniently: what does not parse is left out. */
export function parseMenu(value: unknown): MenuConfig {
    let parsed: unknown = {};
    if (typeof value === 'string' && value.trim() !== '') {
        try {
            parsed = JSON.parse(value);
        } catch {
            parsed = {};
        }
    }

    const config = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    return { server: parseEntries(config.server), account: parseEntries(config.account) };
}

/** The setting's value: each menu's entries without their empty fields, the menus without entries left out. */
export function serializeMenu(config: MenuConfig): string {
    const out: Partial<Record<MenuArea, MenuEntry[]>> = {};
    for (const area of ['server', 'account'] as const) {
        if (config[area].length > 0) {
            out[area] = config[area].map(
                (entry) => Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== undefined && value !== false && value !== '')) as MenuEntry
            );
        }
    }
    return JSON.stringify(out);
}

/**
 * The menu's items with the administrator's changes, in their order: the items they placed first,
 * in theirs, then the rest in the panel's. `base` names an item before any change; outside the
 * server's menu every item is in General.
 */
export function applyMenu(
    items: readonly NavItem[],
    entries: readonly MenuEntry[],
    grouped: boolean,
    base: (item: NavItem) => { label: string; icon: string }
): MenuRow[] {
    const placed = new Map(entries.map((entry, index) => [entry.key, { entry, index }]));

    return items
        .map((item, index) => {
            const key = menuKey(item);
            const found = placed.get(key);
            const entry = found?.entry;
            const own = base(item);
            const group: MenuGroup = grouped ? defaultGroup(item) : 'General';

            return {
                row: {
                    item,
                    key,
                    label: entry?.label ?? own.label,
                    icon: entry?.icon ?? own.icon,
                    group: grouped ? (entry?.group ?? group) : 'General',
                    hidden: entry?.hidden === true,
                    entry,
                    original: { ...own, group },
                },
                rank: found ? found.index : 10_000 + index,
            };
        })
        .sort((a, b) => a.rank - b.rank)
        .map(({ row }) => row);
}

/** The server menu's groups that hold items, in their order. */
export function groupRows<T extends { readonly group: MenuGroup }>(rows: readonly T[]): { title: MenuGroup; rows: T[] }[] {
    return MENU_GROUPS.map((title) => ({ title, rows: rows.filter((row) => row.group === title) })).filter((group) => group.rows.length > 0);
}
