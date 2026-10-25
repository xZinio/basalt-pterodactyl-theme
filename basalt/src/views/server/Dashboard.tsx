import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { useCurrentUser } from '@pterodactyl/sdk';
import { View, useThemeSettings, type ServerConsoleModel } from '@pterodactyl/sdk/theme';
import { usePlayers, usePreferences, useServerMeta } from '../../lib/api';
import { useBilling } from '../../lib/billing';
import { parseLayout, type Block } from '../../lib/blocks';
import { SELECT_BLOCK_MESSAGE, usePreviewDraft } from '../../lib/preview';
import type { ThemeSettings } from '../../theme-types';
import { DashboardServer } from '../shell/context';
import { Banner, Billing, Notes, Notice, QuickActions, ServerInfo, Sftp, Stats } from './overview/blocks';
import ServerHeader from './ServerHeader';

/**
 * Packs the blocks by height: once measured, each spans as many of the grid's 1px rows as it is
 * tall, with the gap below it, so a short block fills the space beside a taller one.
 */
function useMasonry(grid: RefObject<HTMLDivElement | null>, layout: readonly Block[]): void {
    useLayoutEffect(() => {
        const element = grid.current;
        if (!element) return;

        const measure = () => {
            const gap = parseFloat(getComputedStyle(element).columnGap) || 0;
            for (const block of element.querySelectorAll<HTMLElement>(':scope > .basalt-sd-block')) {
                const inner = block.firstElementChild;
                if (inner instanceof HTMLElement) block.style.gridRowEnd = `span ${Math.max(1, Math.ceil(inner.getBoundingClientRect().height + gap))}`;
            }
            element.dataset.masonry = '';
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        element.querySelectorAll(':scope > .basalt-sd-block > .basalt-sd-inner').forEach((inner) => observer.observe(inner));
        return () => observer.disconnect();
    }, [grid, layout]);
}

/**
 * The server's dashboard: the blocks of the Layout setting on a twelve-column grid, each as wide
 * as it is set to, packed by height. The console page places it on the server's first page while
 * the dashboard setting is on. In the studio's preview it follows the draft as it changes, and
 * while the studio shows its settings a click on a block opens that block there.
 */
export default function Dashboard({ model }: { model: ServerConsoleModel }) {
    const user = useCurrentUser();
    const settings = useThemeSettings<ThemeSettings>();
    const draft = usePreviewDraft();
    const { server } = model;
    const { attributes } = server;
    const meta = useServerMeta([attributes.uuid])[attributes.uuid];
    const { content } = usePreferences();
    const players = usePlayers(meta?.minecraft && content.players.dashboard ? [attributes.uuid] : [])[attributes.uuid] ?? null;
    const grid = useRef<HTMLDivElement>(null);

    const value = draft ? draft.settings.dashboardLayout : settings.dashboardLayout;
    const layout = useMemo(() => parseLayout(value), [value]);
    // Only a dashboard with the Billing block, or with an upgrade among its quick actions, asks for the service.
    const upgrades = content.quickActions.some((action) => action.action === 'upgrade') && layout.some((block) => block.type === 'actions' && block.items?.includes('custom'));
    const billing = useBilling(upgrades || layout.some((block) => block.type === 'billing') ? [attributes.uuid] : []);
    const service = billing.settings?.block ? (billing.servers[attributes.uuid] ?? null) : null;
    const upgrade = billing.servers[attributes.uuid]?.upgrade_url ?? null;
    const editing = draft?.focus !== undefined;
    const focus = draft?.focus ?? null;
    useMasonry(grid, layout);

    useEffect(() => {
        if (focus) grid.current?.querySelector(`[data-block="${CSS.escape(focus)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, [focus]);

    // Who may use SFTP: the owner, or a subuser given it. A server without the meta is the user's own.
    const permissions = server.meta?.user_permissions ?? [];
    const sftp = server.meta?.is_server_owner !== false || permissions.includes('*') || permissions.includes('file.sftp');
    const banner = meta?.banner ?? (typeof settings.serverBanner === 'string' ? settings.serverBanner : null);
    const context = useMemo(
        () => ({ node: attributes.node, players, suspended: attributes.is_suspended }),
        [attributes.node, attributes.is_suspended, players]
    );

    const render = (block: Block) => {
        switch (block.type) {
            case 'header':
                return <ServerHeader name={model.name} description={model.description} className='mb-0' />;
            case 'banner':
                return <Banner name={model.name} image={banner} height={block.height} />;
            case 'stats':
                return <Stats items={block.items ?? []} />;
            case 'graphs':
                return <View name='server.graphs' />;
            case 'info':
                return <ServerInfo items={block.items ?? []} server={attributes} meta={meta} location={content.locations.dashboard} />;
            case 'actions':
                return <QuickActions items={block.items ?? []} server={server} custom={content.quickActions} upgrade={upgrade} />;
            case 'sftp':
                return sftp ? <Sftp server={attributes} username={user.username} /> : null;
            case 'notes':
                return <Notes server={attributes.uuid} />;
            case 'notice':
                return <Notice block={block} />;
            case 'billing':
                return service && <Billing service={service} />;
            default:
                return null;
        }
    };

    return (
        <DashboardServer.Provider value={context}>
            <div ref={grid} className='basalt-sd' data-editing={editing ? '' : undefined}>
                {layout.map((block) => (
                    <div
                        key={block.id}
                        className='basalt-sd-block'
                        data-block={block.id}
                        data-width={block.width}
                        data-type={block.type}
                        data-focus={focus === block.id ? '' : undefined}
                        onClickCapture={
                            editing
                                ? (event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      window.parent.postMessage({ type: SELECT_BLOCK_MESSAGE, id: block.id }, window.location.origin);
                                  }
                                : undefined
                        }
                    >
                        <div className='basalt-sd-inner'>{render(block)}</div>
                    </div>
                ))}
            </div>
        </DashboardServer.Provider>
    );
}
