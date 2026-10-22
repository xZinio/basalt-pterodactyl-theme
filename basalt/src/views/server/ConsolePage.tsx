import { Alert, ServerContentBlock } from '@pterodactyl/sdk';
import { Slot, View, type ServerConsoleModel, type ViewProps } from '@pterodactyl/sdk/theme';
import ServerHeader from './ServerHeader';

const notices = {
    maintenance: 'The node of this server is under maintenance, so its actions are unavailable.',
    installing: 'This server is running its installation, so most actions are unavailable.',
    transferring: 'This server is moving to another node, so its actions are unavailable.',
} satisfies Record<NonNullable<ServerConsoleModel['notice']>, string>;

/** The console: the terminal with the stat tiles docked beside it, and the graphs underneath. */
export default function ConsolePage({ model, active, className }: ViewProps<'page.server.console'>) {
    return (
        <ServerContentBlock title={active ? 'Console' : undefined} className={className}>
            {model.notice && (
                <Alert type='warning' className='mb-4'>
                    {notices[model.notice]}
                </Alert>
            )}
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
            {model.features.map((name) => (
                <View key={name} name={name} />
            ))}
        </ServerContentBlock>
    );
}
