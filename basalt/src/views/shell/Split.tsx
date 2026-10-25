import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { AppWindow, Columns2, ExternalLink, Maximize2, X } from 'lucide-react';
import { cn, usePanelNavigate } from '@pterodactyl/sdk';
import { destinationOf } from '../../lib/links';
import { writeLocal } from '../../lib/local';
import {
    EMBED_FRAME,
    SIDE_WIDTH,
    WINDOW_BOX,
    followSplit,
    savedSideWidth,
    savedWindowBox,
    setSplit,
    sideWidth,
    splitHref,
    windowBox,
    type Split,
} from '../../lib/split';
import { itemClass } from './nav';

const toolButton =
    'inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-(--basalt-control-radius) border-0 bg-transparent text-muted-foreground transition-colors hover:bg-[color:color-mix(in_oklab,var(--foreground)_9%,transparent)] hover:text-foreground';

/**
 * Follows a pointer from a press on `event`'s element until it is let go, calling `move` with how
 * far it went. Meanwhile the page marks itself as dragging, so frames do not take the pointer.
 */
function drag(event: ReactPointerEvent<HTMLElement>, move: (dx: number, dy: number) => void, done: () => void): void {
    if (event.button !== 0) return;
    event.preventDefault();

    const { clientX, clientY, pointerId } = event;
    const target = event.currentTarget;
    target.setPointerCapture(pointerId);
    document.body.setAttribute('data-basalt-dragging', '');

    const moved = (next: PointerEvent) => move(next.clientX - clientX, next.clientY - clientY);
    const ended = () => {
        target.removeEventListener('pointermove', moved);
        target.removeEventListener('pointerup', ended);
        target.removeEventListener('pointercancel', ended);
        document.body.removeAttribute('data-basalt-dragging');
        done();
    };
    target.addEventListener('pointermove', moved);
    target.addEventListener('pointerup', ended);
    target.addEventListener('pointercancel', ended);
}

/** Arrow keys move between a menu's items. */
function moveFocus(event: ReactKeyboardEvent<HTMLElement>): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const at = items.indexOf(document.activeElement as HTMLElement);
    items[(at + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus();
}

/**
 * Right-clicking a link to a page of the panel offers to open it beside the current page, in a
 * floating window or in a new tab; Shift keeps the browser's own menu.
 */
export function SplitMenu({ enabled }: { enabled: boolean }) {
    const [at, setAt] = useState<{ x: number; y: number; href: string; label: string } | null>(null);
    const menu = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!enabled) return;

        const offer = (event: MouseEvent) => {
            if (event.shiftKey) return;
            const link = (event.target instanceof Element ? event.target : null)?.closest('a[href]');
            if (!link?.closest('.basalt-shell') || link.closest('.basalt-split') || link.getAttribute('target') === '_blank') return;
            const href = splitHref(link.getAttribute('href') ?? '');
            if (!href) return;

            event.preventDefault();
            setAt({ x: event.clientX, y: event.clientY, href, label: (link.getAttribute('title') || link.textContent || '').trim().slice(0, 80) });
        };
        document.addEventListener('contextmenu', offer);
        return () => document.removeEventListener('contextmenu', offer);
    }, [enabled]);

    useEffect(() => {
        if (!at) return;

        const close = (event: Event) => {
            if (event instanceof KeyboardEvent ? event.key === 'Escape' : !menu.current?.contains(event.target as Node)) setAt(null);
        };
        const dismiss = () => setAt(null);
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', close);
        window.addEventListener('blur', dismiss);
        window.addEventListener('resize', dismiss);
        window.addEventListener('scroll', dismiss, true);
        menu.current?.querySelector('button')?.focus();
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', close);
            window.removeEventListener('blur', dismiss);
            window.removeEventListener('resize', dismiss);
            window.removeEventListener('scroll', dismiss, true);
        };
    }, [at]);

    if (!at || !enabled) return null;

    const open = (mode: Split['mode']) => {
        setSplit({ href: at.href, label: at.label, mode, nonce: Date.now() });
        setAt(null);
    };
    const item = cn(itemClass(false), 'w-full cursor-pointer border-0 bg-transparent text-left');

    return createPortal(
        <div
            ref={menu}
            role='menu'
            aria-label={at.label || 'Link'}
            onKeyDown={moveFocus}
            style={{ left: Math.min(at.x, window.innerWidth - 232), top: Math.min(at.y, window.innerHeight - 140) }}
            className='glass fixed z-60 flex w-56 flex-col gap-0.5 rounded-(--radius) border border-border p-1.5 shadow-[0_12px_32px_rgb(0_0_0/0.35)]'
        >
            <button type='button' role='menuitem' className={item} onClick={() => open('side')}>
                <Columns2 className='size-4 shrink-0' aria-hidden />
                <span className='basalt-nav-label min-w-0 flex-1 truncate'>Open beside</span>
            </button>
            <button type='button' role='menuitem' className={item} onClick={() => open('float')}>
                <AppWindow className='size-4 shrink-0' aria-hidden />
                <span className='basalt-nav-label min-w-0 flex-1 truncate'>Open in a window</span>
            </button>
            <button
                type='button'
                role='menuitem'
                className={item}
                onClick={() => {
                    window.open(at.href, '_blank', 'noopener');
                    setAt(null);
                }}
            >
                <ExternalLink className='size-4 shrink-0' aria-hidden />
                <span className='basalt-nav-label min-w-0 flex-1 truncate'>Open in a new tab</span>
            </button>
        </div>,
        document.body
    );
}

/** The split's title and its tools: open the page here, swap between pane and window, close. */
function SplitBar({ split, onDragStart }: { split: Split; onDragStart?: (event: ReactPointerEvent<HTMLElement>) => void }) {
    const navigate = usePanelNavigate();
    const other = split.mode === 'side' ? 'Open in a window' : 'Open beside';

    return (
        <div
            onPointerDown={onDragStart}
            data-movable={onDragStart ? '' : undefined}
            className='basalt-split-bar flex min-h-11 flex-none items-center gap-2 border-b border-border bg-(--card) py-1.5 pr-2 pl-3.5'
        >
            <span className='min-w-0 flex-1 truncate text-[13px] leading-[1.5] font-semibold text-foreground'>{split.label || 'Split view'}</span>
            <div className='flex flex-none cursor-default gap-1' onPointerDown={(event) => event.stopPropagation()}>
                <button
                    type='button'
                    aria-label='Open here'
                    title='Open here'
                    className={toolButton}
                    onClick={() => {
                        setSplit(null);
                        void navigate(destinationOf(split.href));
                    }}
                >
                    <Maximize2 className='size-3.5' aria-hidden />
                </button>
                <button
                    type='button'
                    aria-label={other}
                    title={other}
                    className={toolButton}
                    onClick={() => setSplit({ ...split, mode: split.mode === 'side' ? 'float' : 'side' })}
                >
                    {split.mode === 'side' ? <AppWindow className='size-3.5' aria-hidden /> : <Columns2 className='size-3.5' aria-hidden />}
                </button>
                <button type='button' aria-label='Close' title='Close' className={toolButton} onClick={() => setSplit(null)}>
                    <X className='size-3.5' aria-hidden />
                </button>
            </div>
        </div>
    );
}

/**
 * The split's page, in a frame where the shell draws it without its navigation. As the page moves
 * on inside it, the split takes its address and its title: the page's, then the server's.
 */
function SplitFrame({ split }: { split: Split }) {
    const frame = useRef<HTMLIFrameElement>(null);
    // The frame keeps its own address once loaded; a split opened anew remounts it.
    const [source] = useState(split.href);

    useEffect(() => {
        const element = frame.current;
        if (!element) return;

        let timer = 0;
        const read = () => {
            try {
                const location = element.contentWindow?.location;
                const parts = (element.contentDocument?.title ?? '')
                    .split(' | ')
                    .map((part) => part.trim())
                    .filter(Boolean);
                if (location) followSplit(`${location.pathname}${location.search}${location.hash}`, parts.length > 1 ? `${parts[1]} · ${parts[0]}` : (parts[0] ?? ''));
            } catch {
                // A page of another origin cannot be read.
            }
        };
        // The router moves without loading, so the frame is read every second as well.
        const loaded = () => {
            read();
            window.clearInterval(timer);
            timer = window.setInterval(read, 1000);
        };
        element.addEventListener('load', loaded);
        return () => {
            element.removeEventListener('load', loaded);
            window.clearInterval(timer);
        };
    }, []);

    return <iframe ref={frame} name={EMBED_FRAME} title={split.label || 'Split view'} src={source} className='block min-h-0 w-full flex-1 border-0 bg-background' />;
}

/** The split as a pane beside the page, its width dragged or moved with the arrow keys. */
function SidePane({ split }: { split: Split }) {
    const [width, setWidth] = useState(savedSideWidth);
    const latest = useRef(width);
    latest.current = width;

    return (
        <>
            <div
                role='separator'
                aria-orientation='vertical'
                aria-label='Resize'
                aria-valuenow={width}
                tabIndex={0}
                onPointerDown={(event) => {
                    const start = latest.current;
                    drag(
                        event,
                        (dx) => setWidth(sideWidth(start - dx)),
                        () => writeLocal(SIDE_WIDTH, latest.current)
                    );
                }}
                onKeyDown={(event) => {
                    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                    event.preventDefault();
                    const next = sideWidth(width + (event.key === 'ArrowLeft' ? 32 : -32));
                    setWidth(next);
                    writeLocal(SIDE_WIDTH, next);
                }}
                className='basalt-split-resizer sticky top-0 h-dvh w-2.5 flex-none cursor-col-resize touch-none outline-none'
            />
            <section
                aria-label={split.label || 'Split view'}
                style={{ width }}
                className='basalt-split sticky top-0 flex h-dvh min-w-0 flex-none flex-col overflow-hidden bg-background'
            >
                <SplitBar split={split} />
                <SplitFrame key={split.nonce} split={split} />
            </section>
        </>
    );
}

/** The split as a window over the page, moved by its bar and sized by its corner. */
function FloatWindow({ split }: { split: Split }) {
    const [box, setBox] = useState(savedWindowBox);
    const latest = useRef(box);
    latest.current = box;

    useEffect(() => {
        const fit = () => setBox((current) => windowBox(current));
        window.addEventListener('resize', fit);
        return () => window.removeEventListener('resize', fit);
    }, []);

    const start = (kind: 'move' | 'size') => (event: ReactPointerEvent<HTMLElement>) => {
        const from = latest.current;
        drag(
            event,
            (dx, dy) => setBox(windowBox(kind === 'move' ? { ...from, x: from.x + dx, y: from.y + dy } : { ...from, w: from.w + dx, h: from.h + dy })),
            () => writeLocal(WINDOW_BOX, latest.current)
        );
    };

    return (
        <section
            aria-label={split.label || 'Split view'}
            style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
            className='basalt-split fixed z-35 flex min-w-0 flex-col overflow-hidden rounded-(--radius) border border-border bg-background shadow-[0_24px_64px_rgb(0_0_0/0.45)]'
        >
            <SplitBar split={split} onDragStart={start('move')} />
            <SplitFrame key={split.nonce} split={split} />
            <span
                aria-hidden
                onPointerDown={start('size')}
                className='absolute right-[0.3125rem] bottom-[0.3125rem] size-2.5 cursor-nwse-resize touch-none rounded-br-[2px] border-r-2 border-b-2 border-muted-foreground opacity-50 before:absolute before:-inset-2 hover:opacity-100'
            />
        </section>
    );
}

/** The open split: a pane beside the page or a window over it. */
export function SplitPane({ split }: { split: Split }) {
    return split.mode === 'side' ? <SidePane split={split} /> : <FloatWindow split={split} />;
}
