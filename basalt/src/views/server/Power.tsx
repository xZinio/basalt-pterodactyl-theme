import { useContext, type ReactNode } from 'react';
import { Play, RotateCcw, Square } from 'lucide-react';
import { Button, Dialog, cn, type ButtonSize } from '@pterodactyl/sdk';
import { Slot, type ServerPowerModel, type ViewProps } from '@pterodactyl/sdk/theme';
import { PowerPlacement } from '../shell/context';

/** Stop, or Kill behind a confirmation while the server is already stopping. */
function StopButton({
    model,
    size,
    className,
    children,
}: {
    model: ServerPowerModel;
    size: ButtonSize;
    className?: string;
    children: (kill: boolean) => ReactNode;
}) {
    const { enabled, actions } = model;

    if (!model.killable) {
        return (
            <Button.Danger size={size} className={className} disabled={!enabled.stop} onClick={actions.stop} aria-label='Stop' title='Stop'>
                {children(false)}
            </Button.Danger>
        );
    }

    return (
        <Dialog.ConfirmTrigger
            hideCloseIcon
            title='Forcibly stop the process?'
            confirm='Kill'
            trigger={({ onClick }) => (
                <Button.Danger size={size} className={className} disabled={!enabled.kill} onClick={onClick}>
                    {children(true)}
                </Button.Danger>
            )}
            onConfirmed={(_event, close) => {
                close();
                actions.kill();
            }}
        >
            Forcibly stopping a server can corrupt its data.
        </Dialog.ConfirmTrigger>
    );
}

/** The sidebar's compact icon buttons. */
function Compact({ model, className }: { model: ServerPowerModel; className?: string }) {
    const { permissions, enabled, actions } = model;
    const button = 'h-8 min-w-0 flex-1 p-0 [&_svg]:size-3.5';

    if (!permissions.start && !permissions.restart && !permissions.stop) return null;

    return (
        <div className={cn('flex gap-1.5', className)}>
            {permissions.start && (
                <Button size='xsmall' className={button} disabled={!enabled.start} onClick={actions.start} aria-label='Start' title='Start'>
                    <Play aria-hidden />
                </Button>
            )}
            {permissions.restart && (
                <Button size='xsmall' color='grey' isSecondary className={button} disabled={!enabled.restart} onClick={actions.restart} aria-label='Restart' title='Restart'>
                    <RotateCcw aria-hidden />
                </Button>
            )}
            {permissions.stop && (
                <StopButton model={model} size='xsmall' className={button}>
                    {(kill) => (kill ? 'Kill' : <Square aria-hidden />)}
                </StopButton>
            )}
        </div>
    );
}

/** Start, Restart and Stop as text buttons, in the header of the server's pages. */
export default function Power({ model, className }: ViewProps<'server.power'>) {
    const placement = useContext(PowerPlacement);
    const { permissions, enabled, actions } = model;

    if (placement === 'sidebar') return <Compact model={model} className={className} />;

    return (
        <div className={className}>
            <Slot name='server.console.power.before' data={model.server} />
            {(permissions.start || permissions.stop || permissions.restart) && (
                <div className='flex gap-2 sm:justify-end'>
                    {permissions.start && (
                        <Button size='small' className='flex-1 sm:flex-none' disabled={!enabled.start} onClick={actions.start}>
                            Start
                        </Button>
                    )}
                    {permissions.restart && (
                        <Button.Text size='small' className='flex-1 sm:flex-none' disabled={!enabled.restart} onClick={actions.restart}>
                            Restart
                        </Button.Text>
                    )}
                    {permissions.stop && (
                        <StopButton model={model} size='small' className='flex-1 sm:flex-none'>
                            {(kill) => (kill ? 'Kill' : 'Stop')}
                        </StopButton>
                    )}
                </div>
            )}
            <Slot name='server.console.power.after' data={model.server} />
        </div>
    );
}
