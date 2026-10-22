import type { ReactNode } from 'react';
import { NamedIcon, PanelLink, Tooltip, cn, type PanelDestination, type TooltipProps } from '@pterodactyl/sdk';
import { Navigation, NavigationLink, type NavItem } from '@pterodactyl/sdk/theme';
import { externalProps, type ConfiguredLink } from '../../lib/links';

/** Sidebar items: a faint fill on hover, a tinted fill and a short accent bar while active. */
export const itemClass = (collapsed: boolean) =>
    cn(
        'relative flex min-w-0 items-center gap-3 rounded-md px-3 py-2 text-sm leading-[1.5] font-medium no-underline',
        'text-muted-foreground transition-colors duration-150 hover:bg-foreground/[0.06] hover:text-foreground',
        'data-[status=active]:bg-primary/10 data-[status=active]:text-foreground',
        'before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-primary before:opacity-0 data-[status=active]:before:opacity-100',
        collapsed && 'justify-center'
    );

/** Icons for the panel's own items, by area and item id, where its names differ from the look. */
const serverIcons: Record<string, string> = {
    index: 'square-terminal',
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

/** One entry: an icon and its label, or the icon alone in the collapsed rail with the label as a tooltip. */
function Entry({ icon, label, badge, collapsed }: { icon: string; label: string; badge?: ReactNode; collapsed: boolean }) {
    return (
        <>
            <NamedIcon name={icon} size={16} className='size-4 shrink-0' aria-hidden />
            {collapsed ? (
                <span className='sr-only'>{label}</span>
            ) : (
                <>
                    <span className='min-w-0 flex-1 truncate'>{label}</span>
                    {badge}
                </>
            )}
        </>
    );
}

function Tip({ collapsed, label, children }: { collapsed: boolean; label: string; children: TooltipProps['children'] }) {
    return collapsed ? (
        <Tooltip placement='right' content={label}>
            {children}
        </Tooltip>
    ) : (
        children
    );
}

export function SidebarLink({
    destination,
    exact,
    icon,
    label,
    collapsed,
}: {
    destination: PanelDestination;
    exact?: boolean;
    icon: string;
    label: string;
    collapsed: boolean;
}) {
    return (
        <Tip collapsed={collapsed} label={label}>
            <PanelLink destination={destination} exact={exact} className={itemClass(collapsed)}>
                <Entry icon={icon} label={label} collapsed={collapsed} />
            </PanelLink>
        </Tip>
    );
}

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
    rename?: (item: NavItem) => string;
}) {
    return (
        <Navigation items={items}>
            {(item, { badge }) => {
                const label = rename?.(item) ?? item.label;
                return (
                    <Tip collapsed={collapsed} label={label}>
                        <NavigationLink item={item} className={itemClass(collapsed)}>
                            <Entry icon={iconFor(item, area)} label={label} badge={badge} collapsed={collapsed} />
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

/** A group of items under a small heading; the heading hides in the rail and when headings are off. */
export function Section({ title, collapsed, children, className }: { title?: string; collapsed: boolean; children: ReactNode; className?: string }) {
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

/** This theme's server overview, which leads the server's items as its landing page. */
const isOverview = (item: NavItem) => item.extensionId === 'basalt' && item.id === 'overview';

export function groupServerItems(items: readonly NavItem[]): { general: NavItem[]; data: NavItem[] } {
    const general: NavItem[] = [];
    const data: NavItem[] = [];
    for (const item of items) {
        if (isOverview(item)) general.unshift(item);
        else (item.extensionId === undefined && dataItems.has(item.id) ? data : general).push(item);
    }
    return { general, data };
}
