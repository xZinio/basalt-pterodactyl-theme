import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { PanelLink, SpinnerOverlay, Tooltip, cn, usePanelLocation } from '@pterodactyl/sdk';
import {
    Main,
    NavigationLink,
    Slot,
    View,
    useNavigation,
    useThemeSettings,
    type AppArea,
    type AppLayoutModel,
    type LayoutBrand,
    type ViewProps,
} from '@pterodactyl/sdk/theme';
import BrandMark from '../../components/BrandMark';
import { applyAccent } from '../../lib/accent';
import { usePreferences } from '../../lib/api';
import { useLocalState } from '../../lib/local';
import { parseLinks } from '../../lib/links';
import { motionSpeed, useMotion } from '../../lib/motion';
import { usePrivacy } from '../../lib/privacy';
import type { ThemeSettings } from '../../theme-types';
import { SidebarServerSlot } from './context';
import { useServerDashboard } from '../../lib/server';
import { AreaItems, ExternalItem, Section, SidebarLink, groupServerItems, itemClass, serverIndexEntry } from './nav';
import Shortcuts from './Shortcuts';
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

const iconButton =
    'inline-flex shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground';

/** The slots of the area's navigation, which its own layout would render if it drew the navigation. */
function AreaSlot({ area, at }: { area: AppArea; at: 'before' | 'after' }) {
    if (area.kind === 'server') return <Slot name={`server.navigation.${at}`} data={area.server} />;
    if (area.kind === 'account') return <Slot name={`account.navigation.${at}`} />;
    if (area.kind === 'admin') return <Slot name={`panel.navigation.${at}`} />;
    return null;
}

/** The configured sidebar links for this place; account pages show only the ones meant for everywhere. */
function Links({ where, rail }: { where: 'dashboard' | 'account' | 'server'; rail: boolean }) {
    const { navLinks } = useThemeSettings<ThemeSettings>();
    const links = parseLinks(navLinks).filter((link) => link.area === 'all' || link.area === where);

    return links.length > 0 ? (
        <Section title='Links' collapsed={rail} className='mt-4'>
            {links.map((link) => (
                <ExternalItem key={link.url + link.label} link={link} collapsed={rail} />
            ))}
        </Section>
    ) : null;
}

/** The navigation of the area the user is in. */
function AreaNavigation({ model, rail }: { model: AppLayoutModel; rail: boolean }) {
    const { area } = model;
    const account = useNavigation('account');
    const serverDashboard = useServerDashboard();

    if (area.kind === 'server') {
        const { general, data } = groupServerItems(area.nav.items);
        return (
            <>
                <Section title='General' collapsed={rail}>
                    <AreaSlot area={area} at='before' />
                    <AreaItems items={general} area='server' collapsed={rail} rename={(item) => (item.id === 'index' && !item.extensionId ? serverIndexEntry(serverDashboard) : undefined)} />
                </Section>
                {data.length > 0 && (
                    <Section title='Files and data' collapsed={rail} className='mt-0.5'>
                        <AreaItems items={data} area='server' collapsed={rail} />
                    </Section>
                )}
                <AreaSlot area={area} at='after' />
                {area.adminLink && (
                    <>
                        <div className='mx-3 my-2.5 border-t border-border' role='presentation' />
                        <Tooltip placement='right' content='Open Admin Area' disabled={!rail}>
                            <NavigationLink item={area.adminLink} className={cn(itemClass(rail), 'data-[status=active]:bg-transparent before:hidden')}>
                                <ExternalLink className='size-4 shrink-0' aria-hidden />
                                <span className={rail ? 'sr-only' : 'min-w-0 flex-1 truncate'}>Open Admin Area</span>
                            </NavigationLink>
                        </Tooltip>
                    </>
                )}
                <Links where='server' rail={rail} />
            </>
        );
    }

    if (area.kind === 'admin') {
        return (
            <Section title='Administration' collapsed={rail}>
                <AreaSlot area={area} at='before' />
                <AreaItems items={area.nav.items} area='admin' collapsed={rail} />
                <AreaSlot area={area} at='after' />
            </Section>
        );
    }

    const dashboard = model.links.find((link) => link.id === 'dashboard');
    const admin = model.links.find((link) => link.id === 'admin');

    return (
        <>
            <Section collapsed={rail}>
                {dashboard && <SidebarLink destination={dashboard.destination} exact={dashboard.exact} icon='layers' label='Overview' collapsed={rail} />}
                {admin && <SidebarLink destination={admin.destination} exact={admin.exact} icon='user-cog' label='Admin' collapsed={rail} />}
            </Section>
            <Section title='Account' collapsed={rail} className='mt-4'>
                {area.kind === 'account' && <AreaSlot area={area} at='before' />}
                <AreaItems items={area.kind === 'account' ? area.nav.items : account.items} area='account' collapsed={rail} />
                {area.kind === 'account' && <AreaSlot area={area} at='after' />}
            </Section>
            <Links where={area.kind === 'dashboard' ? 'dashboard' : 'account'} rail={rail} />
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
 * The frame of every signed-in page: a frosted sidebar with the area's navigation on large screens,
 * a bar and a drawer below them, and the page in <Main>.
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

    const { userAccent, pageTransition } = useThemeSettings<ThemeSettings>();
    const preferences = usePreferences();

    // The user's personal accent, while administrators allow them; the panel's own until their preferences arrive.
    useEffect(() => {
        if (!userAccent) applyAccent(null);
        else if (preferences.loaded) applyAccent(preferences.accent);
    }, [userAccent, preferences.loaded, preferences.accent]);

    const rail = collapsed && desktop;

    // A link in the drawer closes it when it navigates.
    useEffect(() => setDrawer(false), [pathname]);

    // Each page comes in as it opens. The element stays, and so does the console the server pages keep mounted.
    useEffect(() => {
        const entrance = entrances[pageTransition];
        if (motion && entrance) page.current?.animate?.(entrance, { duration: motionSpeed(), easing: 'cubic-bezier(0.2, 0, 0, 1)' });
    }, [pathname, motion, pageTransition]);

    return (
        <SidebarServerSlot.Provider value={serverSlot}>
            <div className={cn('min-h-dvh lg:flex', className)}>
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
                    <PanelLink destination={{ to: '/' }} className='flex min-w-0 items-center gap-2.5 text-foreground no-underline'>
                        <Logo brand={model.brand} />
                        <span className={brandNameClass}>{model.brand.name}</span>
                    </PanelLink>
                </header>

                {drawer && <div className='fixed inset-0 z-40 bg-black/60 lg:hidden' onClick={() => setDrawer(false)} aria-hidden />}

                <aside
                    id='basalt-sidebar'
                    data-rail={rail || undefined}
                    className={cn(
                        'group/sidebar glass fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-y-auto border-r border-sidebar-border px-3 py-4 transition-transform duration-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                        drawer ? 'translate-x-0' : '-translate-x-full',
                        'lg:sticky lg:top-0 lg:z-30 lg:h-dvh lg:shrink-0 lg:translate-x-0 lg:transition-[width]',
                        rail ? 'lg:w-[68px]' : 'lg:w-sidebar'
                    )}
                >
                    <div className={cn('flex h-10 shrink-0 items-center gap-2.5 pl-2', rail && 'h-auto flex-col gap-2 pl-0')}>
                        <PanelLink
                            destination={{ to: '/' }}
                            aria-label={rail ? model.brand.name : undefined}
                            className={cn('flex h-10 min-w-0 items-center gap-2.5 text-foreground no-underline', rail ? 'flex-none' : 'flex-1')}
                        >
                            <Logo brand={model.brand} />
                            {!rail && <span className={brandNameClass}>{model.brand.name}</span>}
                        </PanelLink>
                        <button
                            type='button'
                            aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
                            title={rail ? 'Expand sidebar' : 'Collapse sidebar'}
                            onClick={() => setCollapsed(!collapsed)}
                            className={cn(iconButton, 'hidden size-8 lg:inline-flex')}
                        >
                            {rail ? <PanelLeftOpen className='size-[18px]' aria-hidden /> : <PanelLeftClose className='size-[18px]' aria-hidden />}
                        </button>
                        <button type='button' aria-label='Close navigation' onClick={() => setDrawer(false)} className={cn(iconButton, 'size-8 lg:hidden')}>
                            <X className='size-[18px]' aria-hidden />
                        </button>
                    </div>

                    <div ref={setServerSlot} className='mt-5 -mb-0.5 shrink-0 empty:hidden group-data-rail/sidebar:hidden' />

                    {/* The whole sidebar scrolls when its items outgrow the window, the user menu last. */}
                    <nav aria-label='Main' className='mt-4 flex shrink-0 flex-col'>
                        <Slot name='nav.items.before' compact={rail} />
                        <AreaNavigation model={model} rail={rail} />
                        <Slot name='nav.items.after' compact={rail} />
                    </nav>

                    <div className='mt-auto shrink-0 pt-4'>
                        <UserMenu model={model} collapsed={rail} onShortcuts={() => setShortcuts(true)} />
                    </div>
                </aside>

                <Backdrop area={model.area.kind} />

                <Main className='min-w-0 flex-1'>
                    <div ref={page} className='basalt-page'>
                        {children}
                    </div>
                </Main>

                {/* The panel's server search: its shortcuts open it; the trigger stays out of sight. */}
                <View name='app.search' className='sr-only' />
                <Shortcuts open={shortcuts} setOpen={setShortcuts} />
            </div>
        </SidebarServerSlot.Provider>
    );
}
