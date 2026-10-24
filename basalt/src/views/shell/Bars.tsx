import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, PanelBottomClose, PanelBottomOpen, PanelTopClose, PanelTopOpen, Search } from 'lucide-react';
import { cn, usePanelLocation, useShortcut } from '@pterodactyl/sdk';
import { useThemeSettings } from '@pterodactyl/sdk/theme';
import { openSearch, searchKey } from '../../lib/search';
import type { ThemeSettings } from '../../theme-types';
import { NavLayout, itemClass } from './nav';

/** The shell's icon buttons: collapsing the sidebar or a bar, the bars' overflow menu, the drawer. */
export const iconButton =
    'inline-flex shrink-0 items-center justify-center rounded-(--basalt-control-radius) border-0 bg-transparent text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground';

/**
 * The navigation across a top or bottom bar: the items in one row, those that do not fit in a menu
 * behind a chevron, and, while the menu style is collapsible, a button between labels and icons.
 * `items` draws the items, collapsed or not, for the row or, without the slots, for the menu; the
 * menu shows the ones the row hides, matched by their `data-nav-key`.
 */
export function HorizontalNav({
    position,
    items,
    collapsed,
    onCollapse,
}: {
    position: 'top' | 'bottom';
    items: (collapsed: boolean, menu: boolean) => ReactNode;
    collapsed: boolean;
    onCollapse?: () => void;
}) {
    const row = useRef<HTMLDivElement>(null);
    const more = useRef<HTMLDivElement>(null);
    const [overflow, setOverflow] = useState(false);
    const [open, setOpen] = useState(false);
    const { pathname } = usePanelLocation();

    // From the first item that runs past the row's edge on, the items hide there and show in the menu instead.
    const sync = useCallback(() => {
        const element = row.current;
        if (!element) return;

        const bounds = element.getBoundingClientRect();
        const hidden = new Set<string>();
        let past = false;
        element.querySelectorAll<HTMLElement>('.basalt-nav-item[data-nav-key]').forEach((item) => {
            const box = item.getBoundingClientRect();
            past ||= box.right > bounds.right + 0.5 || box.left < bounds.left - 0.5;
            item.toggleAttribute('data-overflowed', past);
            if (past) hidden.add(item.dataset.navKey!);
        });
        more.current?.querySelectorAll<HTMLElement>('[role="menu"] .basalt-nav-item').forEach((item) => {
            item.hidden = !hidden.has(item.dataset.navKey ?? '');
        });
        setOverflow(hidden.size > 0);
    }, []);

    useLayoutEffect(() => {
        const element = row.current;
        if (!element) return;

        const observer = new ResizeObserver(sync);
        observer.observe(element);
        void document.fonts?.ready.then(sync);
        return () => observer.disconnect();
    }, [sync]);

    // Items change with the page; the menu draws its items when it opens.
    useLayoutEffect(sync);

    useEffect(() => setOpen(false), [pathname, collapsed, overflow]);

    useEffect(() => {
        if (!open) return;

        const close = (event: Event) => {
            if (event instanceof KeyboardEvent ? event.key === 'Escape' : !more.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('pointerdown', close);
        document.addEventListener('keydown', close);
        return () => {
            document.removeEventListener('pointerdown', close);
            document.removeEventListener('keydown', close);
        };
    }, [open]);

    const Collapse = position === 'top' ? (collapsed ? PanelTopOpen : PanelTopClose) : collapsed ? PanelBottomOpen : PanelBottomClose;
    const More = position === 'top' ? ChevronDown : ChevronUp;

    return (
        <div data-collapsed={collapsed || undefined} className='basalt-bar-nav relative flex min-w-0 flex-1 items-center gap-1.5'>
            <NavLayout.Provider value={position}>
                <div ref={row} className='min-w-0 flex-1 overflow-hidden'>
                    <nav aria-label='Main' className='flex w-max min-w-full gap-0.5'>
                        {items(collapsed, false)}
                    </nav>
                </div>
            </NavLayout.Provider>
            <div ref={more} className={cn('relative shrink-0', !overflow && 'pointer-events-none invisible')}>
                <button
                    type='button'
                    aria-haspopup='menu'
                    aria-expanded={open}
                    aria-label='More'
                    title='More'
                    onClick={() => setOpen(!open)}
                    className={cn(iconButton, 'size-9')}
                >
                    <More className='size-[18px]' aria-hidden />
                </button>
                {open && overflow && (
                    <div
                        role='menu'
                        aria-label='More'
                        className={cn(
                            'basalt-bar-menu absolute right-0 z-30 flex max-h-[min(32rem,calc(100dvh-6rem))] w-max max-w-[min(22rem,85vw)] min-w-52 flex-col gap-0.5 overflow-y-auto rounded-(--radius) border border-border bg-popover p-1.5 shadow-[0_12px_32px_rgb(0_0_0/0.35)]',
                            position === 'top' ? 'top-[calc(100%+0.5rem)]' : 'bottom-[calc(100%+0.5rem)]'
                        )}
                        onClick={(event) => {
                            if ((event.target as HTMLElement).closest('a')) setOpen(false);
                        }}
                    >
                        <NavLayout.Provider value={position}>{items(false, true)}</NavLayout.Provider>
                    </div>
                )}
            </div>
            {onCollapse && (
                <button
                    type='button'
                    aria-expanded={!collapsed}
                    aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
                    title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
                    onClick={onCollapse}
                    className={cn(iconButton, 'size-9')}
                >
                    <Collapse className='size-[18px]' aria-hidden />
                </button>
            )}
        </div>
    );
}

/** The top bar's button for the server search, with the shortcut that opens it. */
export function SearchButton() {
    const settings = useThemeSettings<ThemeSettings>();
    const key = settings.searchShortcut ? searchKey(settings.searchKey) : null;
    // Named only: the search view listens for the keys.
    const shortcut = useShortcut(key ? `mod+${key}` : 'mod+/', openSearch, { when: false });

    return (
        <button type='button' title='Search' aria-keyshortcuts={shortcut.aria} onClick={openSearch} className={cn(itemClass(false), 'shrink-0 border-0 bg-transparent')}>
            <Search className='size-4 shrink-0' aria-hidden />
            <span className='basalt-nav-label'>Search</span>
            <kbd className='rounded border border-border px-1.5 font-sans text-[0.6875rem] text-muted-foreground'>{shortcut.label}</kbd>
        </button>
    );
}
