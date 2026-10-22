import type { LucideIcon } from 'lucide-react';
import { Cpu, HardDrive, MemoryStick, Server as ServerIcon, Users } from 'lucide-react';
import { Badge, Spinner, bytesToString, cn } from '@pterodactyl/sdk';
import { Slot, type ServerUnavailableReason, type UiTone, type ViewProps } from '@pterodactyl/sdk/theme';
import { useCardData } from './data';

const unavailable: Record<ServerUnavailableReason, [string, UiTone]> = {
    suspended: ['Suspended', 'danger'],
    'connection-error': ['Connection error', 'danger'],
    maintenance: ['Node maintenance', 'warning'],
    transferring: ['Transferring', 'neutral'],
    installing: ['Installing', 'neutral'],
    'restoring-backup': ['Restoring backup', 'neutral'],
    unavailable: ['Unavailable', 'neutral'],
};

function Metric({ icon: Icon, label, value, danger }: { icon: LucideIcon; label: string; value: string; danger?: boolean }) {
    return (
        <div className='min-w-0'>
            <span className={cn('flex items-center gap-1.5 text-sm leading-[1.5] font-medium text-foreground', danger && 'text-destructive')}>
                <Icon className='size-[15px] shrink-0' aria-hidden />
                <span className='truncate'>{value}</span>
            </span>
            <span className='block text-xs leading-[1.5] text-muted-foreground'>{label}</span>
        </div>
    );
}

/** A server's identity and usage, as the dashboard's cards show them. */
export default function ServerCard({ model, server, className }: ViewProps<'dashboard.serverCard'>) {
    const { players } = useCardData(model.uuid);
    const { state } = model;

    return (
        <div className={cn('min-w-0', className)}>
            <div className='flex min-w-0 items-start gap-2.5 pr-12'>
                <span className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-popover text-muted-foreground'>
                    <ServerIcon className='size-[18px]' aria-hidden />
                </span>
                <div className='min-w-0 flex-1'>
                    <p className='truncate text-[17px] leading-[1.375] font-semibold text-foreground'>{model.name}</p>
                    {model.description && <p className='mt-0.5 line-clamp-2 text-[13px] leading-[1.375] text-muted-foreground'>{model.description}</p>}
                </div>
                <Slot name='dashboard.serverRow.name.after' data={server} />
            </div>

            {state.kind === 'loading' && <Spinner size='small' />}
            {state.kind === 'unavailable' && (
                <div className='mt-4'>
                    <Badge tone={unavailable[state.reason][1]}>{unavailable[state.reason][0]}</Badge>
                </div>
            )}
            {state.kind === 'ready' && (
                <div className='mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5'>
                    <Metric icon={Cpu} label='CPU' value={`${state.cpu.value.toFixed(2)} %`} danger={state.cpu.alarm === 'danger'} />
                    <Metric icon={MemoryStick} label='Memory' value={bytesToString(state.memory.value)} danger={state.memory.alarm === 'danger'} />
                    <Metric icon={HardDrive} label='Disk' value={bytesToString(state.disk.value)} danger={state.disk.alarm === 'danger'} />
                    {players && <Metric icon={Users} label='Players' value={`${players.online} / ${players.max}`} />}
                </div>
            )}
        </div>
    );
}
