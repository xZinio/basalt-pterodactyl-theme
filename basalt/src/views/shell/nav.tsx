import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { NamedIcon, PanelLink, Tooltip, cn, type PanelDestination, type TooltipProps } from '@pterodactyl/sdk';
import { Navigation, NavigationLink, useThemeSettings, type NavItem } from '@pterodactyl/sdk/theme';
import { useFollow } from '../../lib/links';
import { MENU_MESSAGE, applyMenu, menuKey, parseMenu, type KnownItem, type MenuArea, type MenuRow } from '../../lib/menu';
import { inPreviewFrame } from '../../lib/preview';
import { useServerDashboard } from '../../lib/server';
import type { ThemeSettings } from '../../theme-types';

/**
 * Navigation items: the sidebar's accent fill on hover. The stylesheet marks the active one, by the
 * Active item setting.
 */
export const itemClass = (collapsed: boolean) =>
    cn(
        'basalt-nav-item relative flex min-w-0 items-center gap-3 rounded-(--basalt-control-radius) px-3 py-2 text-sm leading-[1.5] font-medium no-underline',
        'text-muted-foreground transition-colors duration-(--basalt-speed) ease-(--basalt-ease) hover:bg-sidebar-accent hover:text-foreground',
        collapsed && 'justify-center'
    );

/**
 * Where the navigation is drawn: down the sidebar, in groups under headings, or across a top or
 * bottom bar, in one row whose collapsed items show their label above or below them.
 */
export const NavLayout = createContext<'column' | 'top' | 'bottom'>('column');

/** Icons for the panel's own items, by area and item id, where its names differ from the look. */
const serverIcons: Record<string, string> = {
    files: 'folder',
    databases: 'database',
    schedules: 'calendar-clock',
    users: 'users',
    backups: 'archive',
    network: 'network',
    startup: 'rocket',
    settings: 'settings',
    activity: 'history',
};

export function iconFor(item: NavItem, area: 'server' | 'account' | 'admin'): string {
    if (area === 'server' && item.extensionId === undefined && serverIcons[item.id]) return serverIcons[item.id];
    return item.icon ?? 'puzzle';
}

/** The server's first page: its dashboard while the dashboard is on, else its console. */
export const serverIndexEntry = (dashboard: boolean) =>
    dashboard ? { label: 'Dashboard', icon: 'layout-dashboard' } : { label: 'Console', icon: 'square-terminal' };

/** One entry: an icon and its label, or the icon alone in the collapsed rail with the label as a tooltip. */
function Entry({ icon, label, badge, collapsed }: { icon: string; label: string; badge?: ReactNode; collapsed: boolean }) {
    return (
        <>
            <NamedIcon name={icon} size={16} className='size-4 shrink-0' aria-hidden />
            {collapsed ? (
                <span className='sr-only'>{label}</span>
            ) : (
                <>
                    <span className='basalt-nav-label min-w-0 flex-1 truncate'>{label}</span>
                    {badge}
                </>
            )}
        </>
    );
}

function Tip({ collapsed, label, children }: { collapsed: boolean; label: string; children: TooltipProps['children'] }) {
    const layout = useContext(NavLayout);

    return collapsed ? (
        <Tooltip placement={layout === 'column' ? 'right' : layout === 'top' ? 'bottom' : 'top'} content={label}>
            {children}
        </Tooltip>
    ) : (
        children
    );
}

export function SidebarLink({
    id,
    destination,
    exact,
    icon,
    label,
    collapsed,
}: {
    id: string;
    destination: PanelDestination;
    exact?: boolean;
    icon: string;
    label: string;
    collapsed: boolean;
}) {
    return (
        <Tip collapsed={collapsed} label={label}>
            <PanelLink destination={destination} exact={exact} className={itemClass(collapsed)} data-nav-key={`main:${id}`}>
                <Entry icon={icon} label={label} collapsed={collapsed} />
            </PanelLink>
        </Tip>
    );
}

/** An item's own label and icon: the theme's icons, and the server's first page named for what it shows. */
const ownEntry = (area: MenuArea | 'admin', dashboard: boolean) => (item: NavItem) =>
    area === 'server' && item.id === 'index' && !item.extensionId ? serverIndexEntry(dashboard) : { label: item.label, icon: iconFor(item, area) };

/**
 * An area's items as the menu shows them: for the server's and the account's menus, the way the
 * Menu items setting arranges them, the server's in the panel's order with the console screen after
 * the first page; for the others, as the panel lists them.
 */
export function useMenuRows(area: MenuArea | 'admin', items: readonly NavItem[]): MenuRow[] {
    const { menuItems } = useThemeSettings<ThemeSettings>();
    const dashboard = useServerDashboard();

    return useMemo(
        () =>
            area === 'admin'
                ? applyMenu(items, [], false, ownEntry(area, dashboard))
                : applyMenu(area === 'server' ? orderServerItems(items) : items, parseMenu(menuItems)[area], area === 'server', ownEntry(area, dashboard)),
        [area, items, menuItems, dashboard]
    );
}

/** In the studio's preview, tells the studio the menu's items as they are before any change, for its Menu items editor. */
export function useAnnounceMenu(area: MenuArea | null, items: readonly NavItem[]): void {
    const dashboard = useServerDashboard();

    useEffect(() => {
        if (!area || !inPreviewFrame()) return;

        const known: KnownItem[] = applyMenu(area === 'server' ? orderServerItems(items) : items, [], area === 'server', ownEntry(area, dashboard)).map(
            (row) => ({ key: row.key, ...row.original })
        );
        window.parent.postMessage({ type: MENU_MESSAGE, area, items: known }, window.location.origin);
    }, [area, items, dashboard]);
}

/** Items through the engine's <Navigation>, which keeps runtime-gated screens hidden, as their rows name them; hidden rows are left out. */
export function AreaItems({ rows, collapsed }: { rows: readonly MenuRow[]; collapsed: boolean }) {
    const byKey = new Map(rows.map((row) => [row.key, row]));

    return (
        <Navigation items={rows.filter((row) => !row.hidden).map((row) => row.item)}>
            {(item, { badge }) => {
                const row = byKey.get(menuKey(item));
                const label = row?.label ?? item.label;
                return (
                    <Tip collapsed={collapsed} label={label}>
                        <NavigationLink item={item} className={itemClass(collapsed)} data-nav-key={menuKey(item)}>
                            <Entry icon={row?.icon ?? item.icon ?? 'puzzle'} label={label} badge={badge} collapsed={collapsed} />
                        </NavigationLink>
                    </Tip>
                );
            }}
        </Navigation>
    );
}

/** A link of the administrator's: a page of the panel opens in place unless it is set to open in a new tab, like any other address. */
export function ExternalItem({ label, href, icon, newTab, collapsed }: { label: string; href: string; icon: string | null; newTab: boolean; collapsed: boolean }) {
    const follow = useFollow();
    const blank = newTab || !href.startsWith('/');

    return (
        <Tip collapsed={collapsed} label={label}>
            <a
                href={href}
                target={blank ? '_blank' : undefined}
                rel={blank ? 'noopener noreferrer' : undefined}
                onClick={blank ? undefined : (event) => follow(event, href)}
                className={itemClass(collapsed)}
            >
                <Entry icon={icon || 'link'} label={label} collapsed={collapsed} />
            </a>
        </Tip>
    );
}

/**
 * A group of items under a small heading; the heading hides in the rail and when headings are off.
 * Across a bar, the groups run together in one row.
 */
export function Section({ title, collapsed, children, className }: { title?: string; collapsed: boolean; children: ReactNode; className?: string }) {
    if (useContext(NavLayout) !== 'column') return <>{children}</>;

    return (
        <div className={cn('flex flex-col gap-0.5', className)}>
            {title && !collapsed && (
                <div className='px-3 pt-3 pb-1 text-[11px] leading-[1.5] font-semibold tracking-[0.08em] text-muted-foreground uppercase in-data-[basalt-nav-headings=false]:hidden'>
                    {title}
                </div>
            )}
            {children}
        </div>
    );
}

/** This theme's console screen, which follows the server's first page, the dashboard. */
const isConsoleScreen = (item: NavItem) => item.extensionId === 'basalt' && item.id === 'console';

/** The server's items in the panel's order, with this theme's console screen after the first page. */
export function orderServerItems(items: readonly NavItem[]): NavItem[] {
    const ordered = items.filter((item) => !isConsoleScreen(item));
    const consoleItem = items.find(isConsoleScreen);
    if (consoleItem) ordered.splice(ordered.findIndex((item) => item.id === 'index' && item.extensionId === undefined) + 1, 0, consoleItem);
    return ordered;
}
