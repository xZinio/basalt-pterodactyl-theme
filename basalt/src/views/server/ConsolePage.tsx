import { useCallback, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { Alert, ServerContentBlock, cn, http, useCurrentServerUuid, usePanelLocation, useServerWebsocketEvent } from '@pterodactyl/sdk';
import { Slot, View, useThemeSettings, type ServerConsoleModel, type ViewProps } from '@pterodactyl/sdk/theme';
import { setPrelude } from '../../lib/prelude';
import { isConsolePath, useServerDashboard } from '../../lib/server';
import type { ThemeSettings } from '../../theme-types';
import ResourceAlerts from './Alerts';
import Dashboard from './Dashboard';
import ServerHeader from './ServerHeader';

const notices = {
    maintenance: 'The node of this server is under maintenance, so its actions are unavailable.',
    installing: 'This server is running its installation, so most actions are unavailable.',
    transferring: 'This server is moving to another node, so its actions are unavailable.',
} satisfies Record<NonNullable<ServerConsoleModel['notice']>, string>;

// Colour and cursor codes, which a saved log leaves out.
const escapes = /\u001b\[[0-9;?]*[ -/]*[@-~]|\u001b\][^\u0007]*\u0007/g;

/** The console's output since the page opened, as plain text: its last 5,000 lines. */
function useConsoleOutput(): () => readonly string[] {
    const lines = useRef<string[]>([]);

    useServerWebsocketEvent('console output', (line) => {
        lines.current.push(line.replace(escapes, '').replace(/\r/g, ''));
        if (lines.current.length > 5000) lines.current.splice(0, lines.current.length - 5000);
    });

    return useCallback(() => lines.current, []);
}

/** Saves the console's output as a .log file; before any arrives, the last 100 lines Wings keeps. */
function DownloadLog({ model }: { model: ServerConsoleModel }) {
    const output = useConsoleOutput();
    const [busy, setBusy] = useState(false);
    const { identifier } = model.server.attributes;

    const download = async () => {
        setBusy(true);
        let lines = [...output()];
        if (lines.length === 0) {
            try {
                const { data } = await http.get<{ attributes: { lines: string[] } }>(`/api/client/servers/${identifier}/logs`, { params: { lines: 100 } });
                lines = data.attributes.lines.map((line) => line.replace(escapes, ''));
            } catch {
                lines = [];
            }
        }

        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        const url = URL.createObjectURL(new Blob([`${lines.join('\n')}\n`], { type: 'text/plain;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `${model.name.replace(/[^\w.-]+/g, '_') || identifier}-${stamp}.log`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setBusy(false);
    };

    return (
        <button
            type='button'
            aria-label='Download log'
            title='Download log'
            disabled={busy}
            onClick={() => void download()}
            className={cn(
                'absolute top-2.5 right-6 z-2 inline-flex size-8 cursor-pointer items-center justify-center rounded-(--basalt-control-radius) border border-[color:color-mix(in_oklab,var(--terminal-foreground)_14%,transparent)]',
                'bg-[color:color-mix(in_oklab,var(--terminal-background)_85%,transparent)] text-[color:color-mix(in_oklab,var(--terminal-foreground)_70%,transparent)] opacity-0 transition-[opacity,color,border-color] duration-(--basalt-speed)',
                'group-hover/terminal:opacity-100 hover:border-[color:color-mix(in_oklab,var(--primary)_60%,transparent)] hover:text-(--terminal-foreground) focus-visible:opacity-100 disabled:cursor-progress'
            )}
        >
            <Download className='size-[15px]' aria-hidden />
        </button>
    );
}

/**
 * The console: the terminal with the statistics beside it or below it, by the Console settings,
 * and the graphs underneath.
 */
function Console({ model, live }: { model: ServerConsoleModel; live: boolean }) {
    const { consoleStats, consoleGraphs, consoleLogDownload } = useThemeSettings<ThemeSettings>();

    return (
        <>
            <Slot name='server.console.before' data={model.server} />
            <ServerHeader name={model.name} description={model.description} />
            <div data-stats={consoleStats || undefined} className='basalt-console grid grid-cols-1 gap-4'>
                {/* Room for 24 rows and the command line while the stats stack below; beside them, it takes their height. */}
                <div className='basalt-console-terminal group/terminal relative flex min-h-[27.25rem] min-w-0 sm:min-h-[27.75rem]'>
                    <View name='server.terminal' />
                    {consoleLogDownload && live && <DownloadLog model={model} />}
                </div>
                {consoleStats && (
                    <div className='basalt-console-stats min-w-0'>
                        <View name='server.stats' />
                    </div>
                )}
            </div>
            {consoleGraphs && <View name='server.graphs' className='mt-4' />}
            <Slot name='server.console.after' data={model.server} />
        </>
    );
}

/**
 * The server's first page. The engine keeps it mounted under every server page and shows it on the
 * first one. With the dashboard on, that page is the dashboard, and the console screen, an empty
 * route, shows the console from here (`basalt-console-shown` lifts the engine's `hidden`), so one
 * terminal and one set of graphs survive every switch between the two.
 */
export default function ConsolePage({ model, active, className }: ViewProps<'page.server.console'>) {
    const dashboard = useServerDashboard();
    const { pathname } = usePanelLocation();
    const { consolePrelude, consolePreludeColor } = useThemeSettings<ThemeSettings>();
    // Before the terminal writes its first line.
    setPrelude(consolePrelude, consolePreludeColor);
    // On a server's own pages, with its live connection; a view's fixture has neither.
    const live = useCurrentServerUuid() !== undefined;
    const consoleScreen = dashboard && isConsolePath(pathname);
    const showConsole = dashboard ? consoleScreen : active;
    const showDashboard = dashboard && active;

    return (
        <ServerContentBlock
            title={showDashboard ? 'Dashboard' : showConsole ? 'Console' : undefined}
            className={cn(className, consoleScreen && 'basalt-console-shown')}
        >
            {model.notice && (
                <Alert type='warning' className='mb-4'>
                    {notices[model.notice]}
                </Alert>
            )}
            {live && <ResourceAlerts server={model.server} />}
            {dashboard && (
                <div hidden={!showDashboard}>
                    <Dashboard model={model} />
                </div>
            )}
            <div hidden={dashboard && !consoleScreen}>
                <Console model={model} live={live} />
            </div>
            {model.features.map((name) => (
                <View key={name} name={name} />
            ))}
        </ServerContentBlock>
    );
}
