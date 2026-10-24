import { createContext, useContext, type ReactNode } from 'react';
import { NamedIcon, PanelLink, Tooltip, cn, type PanelDestination, type TooltipProps } from '@pterodactyl/sdk';
import { Navigation, NavigationLink, type NavItem } from '@pterodactyl/sdk/theme';
import { externalProps, type ConfiguredLink } from '../../lib/links';

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

/** The key a bar matches an item by, between its row and its overflow menu. */
export const navKey = (item: NavItem) => `${item.extensionId ?? 'panel'}:${item.id}`;

/** An area's items, through the engine's <Navigation>, which keeps runtime-gated screens hidden. */
export function AreaItems({
    items,
    area,
    collapsed,
    rename,
}: {
    items: readonly NavItem[];
    area: 'server' | 'account' | 'admin';
    collapsed: boolean;
    rename?: (item: NavItem) => { label: string; icon: string } | undefined;
}) {
    return (
        <Navigation items={items}>
            {(item, { badge }) => {
                const entry = rename?.(item) ?? { label: item.label, icon: iconFor(item, area) };
                return (
                    <Tip collapsed={collapsed} label={entry.label}>
                        <NavigationLink item={item} className={itemClass(collapsed)} data-nav-key={navKey(item)}>
                            <Entry icon={entry.icon} label={entry.label} badge={badge} collapsed={collapsed} />
                        </NavigationLink>
                    </Tip>
                );
            }}
        </Navigation>
    );
}

export function ExternalItem({ link, collapsed }: { link: ConfiguredLink; collapsed: boolean }) {
    return (
        <Tip collapsed={collapsed} label={link.label}>
            <a href={link.url} className={itemClass(collapsed)} {...externalProps(link.url)}>
                <Entry icon={link.icon ?? 'link'} label={link.label} collapsed={collapsed} />
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

/** The panel's server items in two groups, the way they read: running the server, then its data. */
const dataItems = new Set(['files', 'databases', 'schedules', 'backups']);

/** This theme's console screen, which follows the server's first page, the dashboard. */
const isConsoleScreen = (item: NavItem) => item.extensionId === 'basalt' && item.id === 'console';

/** The server's items in the panel's order, with this theme's console screen after the first page. */
export function orderServerItems(items: readonly NavItem[]): NavItem[] {
    const ordered = items.filter((item) => !isConsoleScreen(item));
    const consoleItem = items.find(isConsoleScreen);
    if (consoleItem) ordered.splice(ordered.findIndex((item) => item.id === 'index' && item.extensionId === undefined) + 1, 0, consoleItem);
    return ordered;
}

export function groupServerItems(items: readonly NavItem[]): { general: NavItem[]; data: NavItem[] } {
    const general: NavItem[] = [];
    const data: NavItem[] = [];
    for (const item of orderServerItems(items)) (item.extensionId === undefined && dataItems.has(item.id) ? data : general).push(item);
    return { general, data };
}
