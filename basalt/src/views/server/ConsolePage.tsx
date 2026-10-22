import { Alert, ServerContentBlock, cn, usePanelLocation } from '@pterodactyl/sdk';
import { Slot, View, type ServerConsoleModel, type ViewProps } from '@pterodactyl/sdk/theme';
import { isConsolePath, useServerDashboard } from '../../lib/server';
import Dashboard from './Dashboard';
import ServerHeader from './ServerHeader';

const notices = {
    maintenance: 'The node of this server is under maintenance, so its actions are unavailable.',
    installing: 'This server is running its installation, so most actions are unavailable.',
    transferring: 'This server is moving to another node, so its actions are unavailable.',
} satisfies Record<NonNullable<ServerConsoleModel['notice']>, string>;

/** The console: the terminal with the stat tiles docked beside it, and the graphs underneath. */
function Console({ model }: { model: ServerConsoleModel }) {
    return (
        <>
            <Slot name='server.console.before' data={model.server} />
            <ServerHeader name={model.name} description={model.description} />
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]'>
                <div className='flex min-w-0'>
                    <View name='server.terminal' />
                </div>
                <View name='server.stats' className='order-last lg:order-none' />
            </div>
            <View name='server.graphs' className='mt-4' />
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
            {dashboard && (
                <div hidden={!showDashboard}>
                    <Dashboard model={model} />
                </div>
            )}
            <div hidden={dashboard && !consoleScreen}>
                <Console model={model} />
            </div>
            {model.features.map((name) => (
                <View key={name} name={name} />
            ))}
        </ServerContentBlock>
    );
}
