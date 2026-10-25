import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cn, resolvePanelDestination } from '@pterodactyl/sdk';
import { DRAFT_MESSAGE, PREVIEW_FRAME, applyDraft } from '../../../lib/preview';
import { Segmented } from './Fields';
import { devices, draftOf, previewPages, reloadsPreview, usePreviewServer, type Device, type PreviewPage, type Setting, type Values } from './model';

/**
 * Where a page is previewed: undefined while it is not known yet, null when there is none. A
 * server's console has a page of its own while the server dashboard is on. The sign-in page is
 * drawn by the studio's own screen, as a signed-in administrator cannot open it.
 */
function frameSource(page: PreviewPage['id'], server: string | null | undefined, consoleScreen: boolean): string | null | undefined {
    if (page === 'overview') return resolvePanelDestination({ to: '/' }).pathname;
    if (page === 'server') return server && `${resolvePanelDestination({ to: '/server/$id', params: { id: server } }).pathname}${consoleScreen ? '/console' : ''}`;
    return `${resolvePanelDestination({ extension: 'basalt', screen: 'studio' }).pathname}?preview=sign-in`;
}

/**
 * The live preview: a page of this panel in a frame at a device's width, scaled to fit the stage.
 * The frame takes the draft as it loads; after that a change to the stylesheet's settings is
 * written into it, a change React reads reloads it, and the frame is told of every change, for
 * what it follows as it changes.
 */
export default function Stage({
    settings,
    values,
    page,
    screen,
    focus,
    device,
    onPage,
    onDevice,
}: {
    settings: readonly Setting[];
    values: Values;
    page: PreviewPage['id'];
    screen?: 'console';
    /** While the Server dashboard settings show: the block open in them, which the preview marks. */
    focus?: string | null;
    device: Device['id'];
    onPage: (page: PreviewPage['id']) => void;
    onDevice: (device: Device['id']) => void;
}) {
    const server = usePreviewServer();
    const source = frameSource(page, server, screen === 'console' && values.serverDashboard !== false);
    const draft = useMemo(() => ({ ...draftOf(settings, values), focus }), [settings, values, focus]);
    const width = devices.find((item) => item.id === device)?.width ?? 1440;
    const frame = useRef<HTMLIFrameElement>(null);
    const scaler = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState<{ width: number; height: number } | null>(null);
    const shown = useRef(values);
    const reload = useRef<ReturnType<typeof setTimeout>>(undefined);

    useLayoutEffect(() => {
        window.basaltStudio = draft;

        const before = shown.current;
        shown.current = values;
        const changed = Object.keys(values).filter((key) => values[key] !== before[key]);
        if (changed.some(reloadsPreview)) {
            // Typing in a text setting reloads once it pauses.
            clearTimeout(reload.current);
            reload.current = setTimeout(() => frame.current?.contentWindow?.location.reload(), 400);
        } else if (frame.current?.contentDocument) {
            if (changed.length > 0) applyDraft(frame.current.contentDocument, draft);
            frame.current.contentWindow?.postMessage({ type: DRAFT_MESSAGE }, window.location.origin);
        }
    }, [draft, values]);

    useEffect(
        () => () => {
            clearTimeout(reload.current);
            delete window.basaltStudio;
        },
        []
    );

    useLayoutEffect(() => {
        const element = scaler.current;
        if (!element) return;

        const observer = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }));
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const scale = box ? box.width / width : 1;

    return (
        <div className='flex min-w-0 flex-col overflow-hidden max-[1100px]:col-span-full max-[1100px]:min-h-[max(32rem,90dvh)] max-[1100px]:border-t max-[1100px]:border-border'>
            <div className='flex flex-wrap justify-between gap-3 border-b border-border px-4 py-3'>
                <Segmented
                    label='Page'
                    value={page}
                    options={previewPages.map((item) => ({ ...item, disabled: item.id === 'server' && server === null }))}
                    onChange={onPage}
                />
                <Segmented label='Device' value={device} options={devices} onChange={onDevice} />
            </div>
            <div className='flex min-h-0 flex-1 flex-col overflow-hidden bg-[color-mix(in_oklab,var(--background)_70%,black)] p-5'>
                <div
                    ref={scaler}
                    className={cn(
                        'relative mx-auto w-full flex-1 overflow-hidden rounded-lg border border-border bg-background shadow-[0_20px_50px_rgb(0_0_0/0.35)]',
                        device === 'mobile' && 'max-w-[24.375rem]'
                    )}
                >
                    {source === null && (
                        <p className='flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground'>
                            There is no server to preview yet.
                        </p>
                    )}
                    {source && box && (
                        <iframe
                            ref={frame}
                            name={PREVIEW_FRAME}
                            title='Preview'
                            src={source}
                            style={{ width, height: box.height / scale, transform: `scale(${scale})` }}
                            className='absolute top-0 left-0 origin-top-left border-0 bg-background'
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
