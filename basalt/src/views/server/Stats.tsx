import { useContext, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Copy, Cpu, HardDrive, MemoryStick, Network, Timer, Zap } from 'lucide-react';
import { CopyOnClick, bytesToString, cn } from '@pterodactyl/sdk';
import type { ServerRunState, ServerStatMetric, ServerStatsModel, ViewProps } from '@pterodactyl/sdk/theme';
import { StatsPlacement } from '../shell/context';
import { FactRow } from './overview/parts';

/** "1d 2h 3m", or "2h 3m 4s" under a day. */
export function duration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(seconds / 86_400);
    const hours = Math.floor((seconds % 86_400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m ${seconds % 60}s`;
}

const stateLabel = (state: ServerRunState | null) =>
    state === null ? 'Unknown' : state === 'running' ? 'Online' : state.charAt(0).toUpperCase() + state.slice(1);

const percent = ({ value, limit }: ServerStatMetric) => (limit > 0 ? Math.min(100, (value / limit) * 100) : 0);

function UsageCard({
    icon: Icon,
    label,
    value,
    limit,
    meter,
    action,
}: {
    icon: LucideIcon;
    label: string;
    value: ReactNode;
    limit?: string | null;
    meter?: ServerStatMetric;
    action?: ReactNode;
}) {
    const tone = meter?.alarm === 'danger' ? 'bg-destructive' : meter?.alarm === 'warning' ? 'bg-warning' : 'bg-primary';

    return (
        <div className='surface flex min-w-0 overflow-hidden'>
            <span className='flex w-16 shrink-0 items-center justify-center bg-primary/12 text-primary'>
                <Icon className='size-5' aria-hidden />
            </span>
            <div className='grid min-w-0 flex-1 gap-0.5 px-4 py-3.5'>
                <p className='flex min-w-0 items-baseline gap-1.5'>
                    <span className='truncate text-[17px] leading-[1.375] font-bold text-foreground' data-sensitive={action ? '' : undefined}>
                        {value}
                    </span>
                    {limit && <small className='shrink-0 text-xs leading-[1.375] font-semibold text-muted-foreground'>/ {limit}</small>}
                    {action}
                </p>
                <p className='caption leading-[1.375]'>{label}</p>
                {meter && (
                    <span className='mt-1.5 block h-1 overflow-hidden rounded-full bg-foreground/10'>
                        <span className={cn('block h-full rounded-full transition-[width] duration-500', tone)} style={{ width: `${percent(meter)}%` }} />
                    </span>
                )}
            </div>
        </div>
    );
}

function Cards({ model, className }: { model: ServerStatsModel; className?: string }) {
    const offline = model.state === 'offline';
    const address = model.address ?? 'n/a';

    return (
        <div className={cn('grid grid-cols-1 gap-4 @min-[461px]:grid-cols-2 @min-[821px]:grid-cols-4', className)}>
            <UsageCard
                icon={Cpu}
                label='CPU'
                value={offline ? '0%' : `${model.cpu.value.toFixed(1)}%`}
                limit={model.cpu.limit ? `${model.cpu.limit}%` : null}
                meter={model.cpu}
            />
            <UsageCard
                icon={MemoryStick}
                label='Memory'
                value={offline ? '0 Bytes' : bytesToString(model.memory.value)}
                limit={model.memory.limit ? bytesToString(model.memory.limit) : null}
                meter={model.memory}
            />
            <UsageCard
                icon={HardDrive}
                label='Disk'
                value={bytesToString(model.disk.value)}
                limit={model.disk.limit ? bytesToString(model.disk.limit) : null}
                meter={model.disk}
            />
            <UsageCard
                icon={Network}
                label='Address'
                value={address}
                action={
                    model.address && (
                        <CopyOnClick text={model.address}>
                            <button
                                type='button'
                                aria-label='Copy the address'
                                className='ml-auto inline-flex size-[26px] shrink-0 items-center justify-center self-center rounded-[6px] border-0 bg-transparent text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground'
                            >
                                <Copy className='size-3.5' aria-hidden />
                            </button>
                        </CopyOnClick>
                    )
                }
            />
        </div>
    );
}

/**
 * The console's stat tiles stay classic's; on the server overview the same live model draws the
 * usage cards, the banner's summary line and the status rows.
 */
export default function Stats({ model, Default, className }: ViewProps<'server.stats'>) {
    const placement = useContext(StatsPlacement);

    if (placement === 'cards') return <Cards model={model} className={className} />;
    if (placement === 'summary') {
        return (
            <span className={className}>
                {model.state === 'running' ? `Online for ${duration(model.uptime)}` : stateLabel(model.state)}
            </span>
        );
    }
    if (placement === 'facts') {
        return (
            <>
                <FactRow icon={Zap} label='Status'>
                    {stateLabel(model.state)}
                </FactRow>
                <FactRow icon={Timer} label='Uptime'>
                    {model.state === 'running' && model.uptime > 0 ? duration(model.uptime) : 'Offline'}
                </FactRow>
            </>
        );
    }

    return <Default className={className} />;
}
