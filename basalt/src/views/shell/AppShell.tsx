import { useEffect, useRef, useState } from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { PanelLink, SpinnerOverlay, cn, usePanelLocation } from '@pterodactyl/sdk';
import {
    Main,
    Slot,
    View,
    useNavigation,
    useThemeSettings,
    type AppArea,
    type AppLayoutModel,
    type LayoutBrand,
    type NavItem,
    type ViewProps,
} from '@pterodactyl/sdk/theme';
import BrandMark from '../../components/BrandMark';
import { applyAccent } from '../../lib/accent';
import { usePreferences } from '../../lib/api';
import { useLocalState } from '../../lib/local';
import { fillLink, linkValues } from '../../lib/content';
import { groupRows, type MenuRow } from '../../lib/menu';
import { motionSpeed, useMotion } from '../../lib/motion';
import { inEmbedFrame, useSplit } from '../../lib/split';
import { usePrivacy } from '../../lib/privacy';
import type { ThemeSettings } from '../../theme-types';
import Announcements from './Announcements';
import { SidebarServerSlot } from './context';
import { HorizontalNav, SearchButton, iconButton } from './Bars';
import { AreaItems, ExternalItem, Section, SidebarLink, useAnnounceMenu, useMenuRows } from './nav';
import Shortcuts from './Shortcuts';
import { SplitMenu, SplitPane } from './Split';
import UserMenu from './UserMenu';

const DESKTOP = '(min-width: 64rem)';

function useDesktop(): boolean {
    const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(DESKTOP).matches);
    useEffect(() => {
        const query = window.matchMedia(DESKTOP);
        const update = () => setDesktop(query.matches);
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);
    return desktop;
}

/** The brand's logo at the Logo height setting; a wide logo keeps its shape. */
export function Logo({ brand, className }: { brand: LayoutBrand; className?: string }) {
    return brand.logoUrl ? (
        <img src={brand.logoUrl} alt='' className={cn('h-(--basalt-logo-height) w-auto max-w-full shrink-0 object-contain', className)} />
    ) : (
        <BrandMark className={cn('size-(--basalt-logo-height) shrink-0', className)} />
    );
}

/** The panel name beside the logo; hidden by the Branding setting, it still names the link. */
const brandNameClass = 'truncate text-lg leading-[1.5] font-semibold in-data-[basalt-hide-name=true]:sr-only';

/** The logo and the panel's name, a link to the overview; in the rail, the logo alone. */
function Brand({ brand, rail = false, className }: { brand: LayoutBrand; rail?: boolean; className?: string }) {
    return (
        <PanelLink
            destination={{ to: '/' }}
            aria-label={rail ? brand.name : undefined}
            className={cn('flex h-10 min-w-0 items-center gap-2.5 text-foreground no-underline', className)}
        >
            <Logo brand={brand} />
            {!rail && <span className={brandNameClass}>{brand.name}</span>}
        </PanelLink>
    );
}

/** The slots of the area's navigation, which its own layout would render if it drew the navigation. */
function AreaSlot({ area, at }: { area: AppArea; at: 'before' | 'after' }) {
    if (area.kind === 'server') return <Slot name={`server.navigation.${at}`} data={area.server} />;
    if (area.kind === 'account') return <Slot name={`account.navigation.${at}`} />;
    if (area.kind === 'admin') return <Slot name={`panel.navigation.${at}`} />;
    return null;
}

/** The administrator's links for this area, with a server's values in them on its pages. */
function Links({ area, rail }: { area: Exclude<AppArea, { kind: 'admin' }>; rail: boolean }) {
    const { content } = usePreferences();
    const values = area.kind === 'server' ? linkValues(area.server) : null;
    const links = content.links.flatMap((link) => {
        const href = link.area === 'everywhere' || link.area === area.kind ? fillLink(link.url, values) : null;
        return href ? [{ ...link, href }] : [];
    });

    return links.length > 0 ? (
        <Section title='Links' collapsed={rail} className='mt-4'>
            {links.map((link) => (
                <ExternalItem key={link.id} label={link.label} href={link.href} icon={link.icon} newTab={link.newTab} collapsed={rail} />
            ))}
        </Section>
    ) : null;
}

/** The overview and, for administrators, the admin area. */
function MainLinks({ model, collapsed }: { model: AppLayoutModel; collapsed: boolean }) {
    const dashboard = model.links.find((link) => link.id === 'dashboard');
    const admin = model.links.find((link) => link.id === 'admin');

    return (
        <>
            {dashboard && <SidebarLink id='dashboard' destination={dashboard.destination} exact={dashboard.exact} icon='layers' label='Overview' collapsed={collapsed} />}
            {admin && <SidebarLink id='admin' destination={admin.destination} exact={admin.exact} icon='user-cog' label='Admin' collapsed={collapsed} />}
        </>
    );
}

/** The area's menu: its rows, as the Menu items setting arranges them, and the server's admin link. */
interface AreaMenu {
    readonly rows: readonly MenuRow[];
    readonly adminLink: readonly MenuRow[];
}

const noItems: readonly NavItem[] = [];

/**
 * The menu of the area the user is in: the server's, the admin area's, or the account's, which the
 * overview shows as well. In the studio's preview, the studio learns the account's menu from every
 * page, and the server's from a server's pages.
 */
function useAreaMenu({ area }: AppLayoutModel): AreaMenu {
    const account = useNavigation('account');
    const kind = area.kind === 'server' ? 'server' : area.kind === 'admin' ? 'admin' : 'account';
    const rows = useMenuRows(kind, area.kind === 'dashboard' ? account.items : area.nav.items);
    const adminLink = useMenuRows('admin', area.kind === 'server' && area.adminLink ? [area.adminLink] : noItems);
    useAnnounceMenu('account', account.items);
    useAnnounceMenu(area.kind === 'server' ? 'server' : null, area.kind === 'server' ? area.nav.items : noItems);

    return { rows, adminLink };
}

/**
 * The area's navigation in one row, for a top or bottom bar: the overview's main links, or the
 * area's items in their order, ungrouped; the bar's menu draws them without the slots.
 */
function BarItems({ model, menu, collapsed, inMenu }: { model: AppLayoutModel; menu: AreaMenu; collapsed: boolean; inMenu: boolean }) {
    const { area } = model;

    if (area.kind === 'dashboard') {
        return (
            <>
                {!inMenu && <Slot name='nav.items.before' compact={collapsed} />}
                <MainLinks model={model} collapsed={collapsed} />
                {!inMenu && <Slot name='nav.items.after' compact={collapsed} />}
            </>
        );
    }

    return (
        <>
            {!inMenu && <AreaSlot area={area} at='before' />}
            <AreaItems rows={menu.rows} collapsed={collapsed} />
            <AreaItems rows={menu.adminLink} collapsed={collapsed} />
            {!inMenu && <AreaSlot area={area} at='after' />}
        </>
    );
}

/** The navigation of the area the user is in. */
function AreaNavigation({ model, menu, rail }: { model: AppLayoutModel; menu: AreaMenu; rail: boolean }) {
    const { area } = model;

    if (area.kind === 'server') {
        return (
            <>
                <AreaSlot area={area} at='before' />
                {groupRows(menu.rows.filter((row) => !row.hidden)).map((group, index) => (
                    <Section key={group.title} title={group.title} collapsed={rail} className={cn('basalt-nav-group', index > 0 && 'mt-0.5')}>
                        <AreaItems rows={group.rows} collapsed={rail} />
                    </Section>
                ))}
                <AreaSlot area={area} at='after' />
                {menu.adminLink.length > 0 && (
                    <>
                        <div className='mx-3 my-2.5 border-t border-border' role='presentation' />
                        <AreaItems rows={menu.adminLink} collapsed={rail} />
                    </>
                )}
                <Links area={area} rail={rail} />
            </>
        );
    }

    if (area.kind === 'admin') {
        return (
            <Section title='Administration' collapsed={rail}>
                <AreaSlot area={area} at='before' />
                <AreaItems rows={menu.rows} collapsed={rail} />
                <AreaSlot area={area} at='after' />
            </Section>
        );
    }

    return (
        <>
            <Section collapsed={rail}>
                <MainLinks model={model} collapsed={rail} />
            </Section>
            <Section title='Account' collapsed={rail} className='mt-4'>
                {area.kind === 'account' && <AreaSlot area={area} at='before' />}
                <AreaItems rows={menu.rows} collapsed={rail} />
                {area.kind === 'account' && <AreaSlot area={area} at='after' />}
            </Section>
            <Links area={area} rail={rail} />
        </>
    );
}

/** A picture's CSS `url()`, escaped. */
const cssUrl = (url: string) => `url("${url.replace(/["\\\n]/g, (char) => (char === '\n' ? '\\a ' : `\\${char}`))}")`;

/**
 * The picture behind the area's pages: the overview's or the server pages' own, else the page
 * background while it is on, from its file or its https:// address.
 */
function Backdrop({ area }: { area: AppArea['kind'] }) {
    const { overviewBackground, serverBackground, backgroundImage, backgroundFile, backgroundUrl } = useThemeSettings<ThemeSettings>();
    const page = backgroundImage ? (backgroundFile ?? (backgroundUrl.startsWith('https://') ? backgroundUrl : null)) : null;
    const picture = (area === 'dashboard' && overviewBackground) || (area === 'server' && serverBackground) || page;

    return picture ? <div className='basalt-backdrop' style={{ backgroundImage: cssUrl(picture) }} aria-hidden /> : null;
}

/** The page's entrance, by the page transition setting. */
const entrances: Readonly<Record<string, Keyframe[]>> = {
    fade: [{ opacity: 0 }, { opacity: 1 }],
    lift: [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'none' },
    ],
};

/**
 * The frame of every signed-in page, by the Layout style setting: a frosted sidebar with the area's
 * navigation on large screens, floating or not, with a bar and a drawer below them; or a top or
 * bottom bar on every screen. The page is in <Main>.
 */
export default function AppShell({ model, className, children }: ViewProps<'layout.app'>) {
    const desktop = useDesktop();
    const [collapsed, setCollapsed] = useLocalState('basalt.sidebar.collapsed', false);
    const [drawer, setDrawer] = useState(false);
    const [shortcuts, setShortcuts] = useState(false);
    const [serverSlot, setServerSlot] = useState<HTMLElement | null>(null);
    const { pathname } = usePanelLocation();
    const page = useRef<HTMLDivElement>(null);
    const motion = useMotion();
    usePrivacy();

    const { userAccent, pageTransition, navigation, menuStyle, searchButton, splitView } = useThemeSettings<ThemeSettings>();
    const preferences = usePreferences();
    const menu = useAreaMenu(model);
    const split = useSplit();

    // The user's personal accent, while administrators allow them; the panel's own until their preferences arrive.
    useEffect(() => {
        if (!userAccent) applyAccent(null);
        else if (preferences.loaded) applyAccent(preferences.accent);
    }, [userAccent, preferences.loaded, preferences.accent]);

    // Icons only, by the Menu style setting, or by this browser's choice while the menu is collapsible.
    const collapsible = menuStyle === 'collapsible';
    const iconsOnly = menuStyle === 'icon' || (collapsible && collapsed);
    const toggle = collapsible ? () => setCollapsed(!collapsed) : undefined;
    const bar = navigation === 'navbar' ? 'top' : navigation === 'bottom' ? 'bottom' : null;
    const rail = iconsOnly && desktop;

    // A link in the drawer closes it when it navigates.
    useEffect(() => setDrawer(false), [pathname]);

    // Each page comes in as it opens. The element stays, and so does the console the server pages keep mounted.
    useEffect(() => {
        const entrance = entrances[pageTransition];
        if (motion && entrance) page.current?.animate?.(entrance, { duration: motionSpeed(), easing: 'cubic-bezier(0.2, 0, 0, 1)' });
    }, [pathname, motion, pageTransition]);

    // A page in a split's frame is drawn alone.
    if (inEmbedFrame()) {
        return (
            <div data-embed className={cn('basalt-shell min-h-dvh', className)}>
                <Main className='min-w-0'>
                    <div ref={page} className='basalt-page'>
                        {children}
                    </div>
                </Main>
            </div>
        );
    }

    // Split view, on large screens of a page that is not itself in a frame.
    const splitting = splitView && desktop && window.parent === window;

    const content = (
        <>
            <Backdrop area={model.area.kind} />

            <div className='flex min-w-0 flex-1'>
                <Main className='min-w-0 flex-1'>
                    <div ref={page} className='basalt-page'>
                        <Announcements area={model.area} />
                        {children}
                    </div>
                </Main>
                {splitting && split && <SplitPane split={split} />}
            </div>

            {/* The panel's server search: its shortcuts open it; the trigger stays out of sight. */}
            <View name='app.search' className='sr-only' />
            <Shortcuts open={shortcuts} setOpen={setShortcuts} />
            <SplitMenu enabled={splitting} />
        </>
    );

    if (bar) {
        const nav = (
            <HorizontalNav
                position={bar}
                collapsed={iconsOnly}
                onCollapse={toggle}
                items={(icons, inMenu) => <BarItems model={model} menu={menu} collapsed={icons} inMenu={inMenu} />}
            />
        );

        // No sidebar, so no server block: the server pages keep their own header.
        return (
            <div className={cn('basalt-shell min-h-dvh', bar === 'bottom' && 'pb-[calc(4.25rem+env(safe-area-inset-bottom))]', className)}>
                <SpinnerOverlay visible={model.signingOut} fixed />

                {bar === 'top' && (
                    <header className='glass sticky top-0 z-20 flex items-center gap-4 border-b border-sidebar-border px-4 py-2'>
                        <Brand brand={model.brand} className='px-2' />
                        {searchButton && <SearchButton />}
                        {nav}
                        <div className='w-64 max-sm:w-auto'>
                            <UserMenu model={model} collapsed={false} placement='top' onShortcuts={() => setShortcuts(true)} />
                        </div>
                    </header>
                )}

                {content}

                {bar === 'bottom' && (
                    <footer className='basalt-bottom-bar fixed inset-x-0 bottom-0 z-30 flex min-w-0 items-center gap-3 border-t border-sidebar-border bg-sidebar px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]'>
                        {nav}
                        <UserMenu model={model} collapsed={false} placement='bottom' onShortcuts={() => setShortcuts(true)} />
                    </footer>
                )}
            </div>
        );
    }

    return (
        <SidebarServerSlot.Provider value={serverSlot}>
            <div className={cn('basalt-shell min-h-dvh lg:flex', className)}>
                <SpinnerOverlay visible={model.signingOut} fixed />

                <header className='sticky top-0 z-30 flex h-[57px] items-center gap-4 border-b border-border bg-sidebar px-3 lg:hidden'>
                    <button
                        type='button'
                        aria-label='Open navigation'
                        aria-controls='basalt-sidebar'
                        aria-expanded={drawer}
                        onClick={() => setDrawer(true)}
                        className={cn(iconButton, 'size-10')}
                    >
                        <Menu className='size-5' aria-hidden />
                    </button>
                    <Brand brand={model.brand} />
                </header>

                {drawer && <div className='fixed inset-0 z-40 bg-black/60 lg:hidden' onClick={() => setDrawer(false)} aria-hidden />}

                <aside
                    id='basalt-sidebar'
                    data-rail={rail || undefined}
                    className={cn(
                        'basalt-sidebar group/sidebar glass fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-y-auto border-r border-sidebar-border px-3 py-4 transition-transform duration-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                        drawer ? 'translate-x-0' : '-translate-x-full',
                        'lg:sticky lg:top-0 lg:z-30 lg:h-dvh lg:shrink-0 lg:translate-x-0 lg:transition-[width]',
                        rail ? 'lg:w-[68px]' : 'lg:w-sidebar'
                    )}
                >
                    <div className={cn('flex h-10 shrink-0 items-center gap-2.5 pl-2', rail && 'h-auto flex-col gap-2 pl-0')}>
                        <Brand brand={model.brand} rail={rail} className={rail ? 'flex-none' : 'flex-1'} />
                        {toggle && (
                            <button
                                type='button'
                                aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
                                title={rail ? 'Expand sidebar' : 'Collapse sidebar'}
                                onClick={toggle}
                                className={cn(iconButton, 'hidden size-8 lg:inline-flex')}
                            >
                                {rail ? <PanelLeftOpen className='size-[18px]' aria-hidden /> : <PanelLeftClose className='size-[18px]' aria-hidden />}
                            </button>
                        )}
                        <button type='button' aria-label='Close navigation' onClick={() => setDrawer(false)} className={cn(iconButton, 'size-8 lg:hidden')}>
                            <X className='size-[18px]' aria-hidden />
                        </button>
                    </div>

                    <div ref={setServerSlot} className='mt-5 -mb-0.5 shrink-0 empty:hidden group-data-rail/sidebar:hidden' />

                    {/* The whole sidebar scrolls when its items outgrow the window, the user menu last. */}
                    <nav aria-label='Main' className='mt-4 flex shrink-0 flex-col'>
                        <Slot name='nav.items.before' compact={rail} />
                        <AreaNavigation model={model} menu={menu} rail={rail} />
                        <Slot name='nav.items.after' compact={rail} />
                    </nav>

                    <div className='mt-auto shrink-0 pt-4'>
                        <UserMenu model={model} collapsed={rail} onShortcuts={() => setShortcuts(true)} />
                    </div>
                </aside>

                {content}
            </div>
        </SidebarServerSlot.Provider>
    );
}
