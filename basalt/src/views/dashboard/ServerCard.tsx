import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Cpu, HardDrive, MemoryStick, Server as ServerIcon, Users } from 'lucide-react';
import { Badge, Spinner, bytesToString, cn } from '@pterodactyl/sdk';
import { Slot, type ServerStatMetric, type ServerUnavailableReason, type UiTone, type ViewProps } from '@pterodactyl/sdk/theme';
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

/** One usage figure: its value, in the alarm's colour past the panel's thresholds, over its label. */
function Metric({ icon: Icon, label, value, limit, metric }: { icon: LucideIcon; label: string; value: ReactNode; limit?: string; metric?: ServerStatMetric }) {
    const named = metric && metric.limit > 0 && limit ? `${label}: ${value} of ${limit}` : `${label}: ${value}`;

    return (
        <div className='basalt-metric' data-alarm={metric?.alarm ?? undefined} aria-label={named} title={named}>
            <span className='basalt-metric-value'>
                <Icon className='size-[15px] shrink-0' aria-hidden />
                <span className='truncate'>{value}</span>
            </span>
            <span className='basalt-metric-limit'>{label}</span>
        </div>
    );
}

/**
 * A server's identity and usage, as the overview's cards show them. The stylesheet lays it out by
 * the Server layout and Server card settings.
 */
export default function ServerCard({ model, server, className }: ViewProps<'dashboard.serverCard'>) {
    const { players } = useCardData(model.uuid);
    const { state } = model;
    const sub = model.description || model.address;

    return (
        <div className={cn('basalt-card', className)}>
            <div className='basalt-card-head'>
                <span className='basalt-card-icon' aria-hidden>
                    <ServerIcon className='size-[18px]' />
                </span>
                <div className='basalt-card-content'>
                    <div className='basalt-card-title'>
                        <p className='basalt-card-name'>{model.name}</p>
                        <Slot name='dashboard.serverRow.name.after' data={server} />
                    </div>
                    {sub && <p className='basalt-card-sub'>{sub}</p>}
                </div>
            </div>

            {state.kind === 'loading' && <Spinner size='small' />}
            {state.kind === 'unavailable' && (
                <div>
                    <Badge tone={unavailable[state.reason][1]}>{unavailable[state.reason][0]}</Badge>
                </div>
            )}
            {state.kind === 'ready' && (
                <div className='basalt-metrics' data-count={players ? 4 : 3}>
                    <Metric icon={Cpu} label='CPU' value={`${state.cpu.value.toFixed(2)} %`} limit={`${state.cpu.limit} %`} metric={state.cpu} />
                    <Metric
                        icon={MemoryStick}
                        label='Memory'
                        value={bytesToString(state.memory.value)}
                        limit={bytesToString(state.memory.limit)}
                        metric={state.memory}
                    />
                    <Metric icon={HardDrive} label='Disk' value={bytesToString(state.disk.value)} limit={bytesToString(state.disk.limit)} metric={state.disk} />
                    {players && <Metric icon={Users} label='Players' value={`${players.online} / ${players.max}`} />}
                </div>
            )}
        </div>
    );
}
