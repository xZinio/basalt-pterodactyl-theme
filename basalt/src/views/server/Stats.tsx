import { Fragment, useContext, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowDownUp, Copy, Cpu, HardDrive, MemoryStick, Network, Timer, Users, Zap } from 'lucide-react';
import { CopyOnClick, bytesToString, cn } from '@pterodactyl/sdk';
import type { ServerRunState, ServerStatsModel, ViewProps } from '@pterodactyl/sdk/theme';
import { DashboardServer, StatsItems, StatsPlacement } from '../shell/context';
import { Chip, CopyButton, FactRow } from './overview/parts';

/** "1d 2h 3m", or "2h 3m 4s" under a day. */
export function duration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(seconds / 86_400);
    const hours = Math.floor((seconds % 86_400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m ${seconds % 60}s`;
}

const labels: Record<ServerRunState, string> = { running: 'Online', starting: 'Starting', stopping: 'Stopping', offline: 'Offline' };

/** How long the server has run, counted on each second between the reports of its usage; 0 while it is not running. */
function useUptime(uptime: number, running: boolean): number {
    const [base, setBase] = useState(() => ({ uptime, at: Date.now() }));
    const [, setTick] = useState(0);
    if (base.uptime !== uptime) setBase({ uptime, at: Date.now() });

    useEffect(() => {
        if (!running) return;
        const timer = window.setInterval(() => setTick((tick) => tick + 1), 1000);
        return () => window.clearInterval(timer);
    }, [running]);

    return running ? uptime + Date.now() - base.at : 0;
}

/** A value's share of its limit, or null without a limit. */
const share = (value: number, limit: number): number | null => (limit > 0 ? Math.max(0, Math.min(100, (value / limit) * 100)) : null);

function UsageCard({
    icon: Icon,
    label,
    value,
    limit,
    meter,
    alarm,
    action,
}: {
    icon: LucideIcon;
    label: string;
    value: ReactNode;
    limit?: string | null;
    /** The share of the limit used, drawn as a bar: amber from 75%, red from 90%. */
    meter?: number | null;
    /** Past its limit: the icon turns red. */
    alarm?: boolean;
    action?: ReactNode;
}) {
    const tone = meter == null ? null : meter >= 90 ? 'bg-destructive' : meter >= 75 ? 'bg-warning' : 'bg-primary';

    return (
        <div className='surface flex min-w-0 overflow-hidden'>
            <span className={cn('flex w-16 shrink-0 items-center justify-center', alarm ? 'bg-destructive text-white' : 'bg-primary/12 text-primary')}>
                <Icon className='size-5' aria-hidden />
            </span>
            <div className='grid min-w-0 flex-1 gap-0.5 px-4 py-3.5'>
                <p className='flex min-w-0 items-baseline gap-1.5'>
                    <span className='truncate text-[17px] leading-[1.375] font-bold text-foreground tabular-nums' data-sensitive={action ? '' : undefined}>
                        {value}
                    </span>
                    {limit && <small className='shrink-0 text-xs leading-[1.375] font-semibold text-muted-foreground'>/ {limit}</small>}
                    {action}
                </p>
                <p className='caption leading-[1.375]'>{label}</p>
                {tone && (
                    <span className='mt-1.5 block h-1 overflow-hidden rounded-full bg-foreground/10'>
                        <span className={cn('block h-full rounded-full transition-[width] duration-600 ease-(--basalt-ease)', tone)} style={{ width: `${meter}%` }} />
                    </span>
                )}
            </div>
        </div>
    );
}

/** The dashboard's stat tiles, the ones its block lists, in their order. */
function Tiles({ model, className }: { model: ServerStatsModel; className?: string }) {
    const items = useContext(StatsItems);
    const { players, suspended } = useContext(DashboardServer);
    const running = !suspended && model.state === 'running';
    const uptime = useUptime(model.uptime, running);
    // Before the first report, nothing is known yet.
    const unknown = model.state === null;
    const offline = unknown || model.state === 'offline';
    const { cpu, memory, disk } = model;

    const tiles: Record<string, ReactNode> = {
        cpu: (
            <UsageCard
                icon={Cpu}
                label='CPU'
                value={offline ? 'Offline' : `${cpu.value.toFixed(1)}%`}
                limit={cpu.limit > 0 && !offline ? `${cpu.limit}%` : null}
                meter={offline ? null : share(cpu.value, cpu.limit)}
            />
        ),
        memory: (
            <UsageCard
                icon={MemoryStick}
                label='Memory'
                value={offline ? 'Offline' : bytesToString(memory.value)}
                limit={memory.limit > 0 && !offline ? bytesToString(memory.limit) : null}
                meter={offline ? null : share(memory.value, memory.limit)}
            />
        ),
        disk: (
            <UsageCard
                icon={HardDrive}
                label='Disk'
                value={unknown ? '...' : bytesToString(disk.value)}
                limit={disk.limit > 0 ? bytesToString(disk.limit) : null}
                meter={unknown ? null : share(disk.value, disk.limit)}
                alarm={!unknown && disk.limit > 0 && disk.value > disk.limit}
            />
        ),
        address: (
            <UsageCard
                icon={Network}
                label='Address'
                value={model.address ?? 'None'}
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
        ),
        uptime: <UsageCard icon={Timer} label='Uptime' value={running ? duration(uptime) : 'Offline'} />,
        network: (
            <UsageCard icon={ArrowDownUp} label='Network (in / out)' value={unknown ? '...' : `${bytesToString(model.network.rx)} / ${bytesToString(model.network.tx)}`} />
        ),
        ...(players && {
            players: <UsageCard icon={Users} label='Players' value={String(players.online)} limit={String(players.max)} meter={share(players.online, players.max)} />,
        }),
    };
    const shown = items.filter((item) => item in tiles);

    return (
        <div className={cn('basalt-sd-tiles', className)} style={{ '--basalt-tiles': Math.max(1, shown.length) } as CSSProperties}>
            {shown.map((item) => (
                <Fragment key={item}>{tiles[item]}</Fragment>
            ))}
        </div>
    );
}

/** One row of the dashboard's server information that the live model knows: its status, uptime or address. */
function Fact({ model }: { model: ServerStatsModel }) {
    const [item] = useContext(StatsItems);
    const { suspended } = useContext(DashboardServer);
    const running = !suspended && model.state === 'running';
    const uptime = useUptime(model.uptime, running && item === 'uptime');

    if (item === 'status') {
        return (
            <FactRow icon={Zap} label='Status'>
                {suspended ? 'Suspended' : labels[model.state ?? 'offline']}
            </FactRow>
        );
    }
    if (item === 'uptime') {
        return (
            <FactRow icon={Timer} label='Uptime'>
                {running ? duration(uptime) : 'Offline'}
            </FactRow>
        );
    }
    if (item === 'address') {
        return (
            <FactRow icon={Network} label='Address'>
                <Chip sensitive>{model.address ?? 'None'}</Chip>
                {model.address && <CopyButton text={model.address} label='Copy the address' />}
            </FactRow>
        );
    }
    return null;
}

/** The banner's line under the name: how long it has run and its players, or its node while it is stopped. */
function Summary({ model, className }: { model: ServerStatsModel; className?: string }) {
    const { node, players, suspended } = useContext(DashboardServer);
    const running = !suspended && model.state === 'running';
    const uptime = useUptime(model.uptime, running);

    return (
        <span className={className}>
            {running ? `Online for ${duration(uptime)}` : node}
            {running && players && ` · ${players.online} of ${players.max} players online`}
        </span>
    );
}

/**
 * The console's stat tiles stay classic's; on the server's dashboard the same live model draws its
 * stat tiles, the banner's summary line and rows of its information.
 */
export default function Stats({ model, Default, className }: ViewProps<'server.stats'>) {
    const placement = useContext(StatsPlacement);

    if (placement === 'cards') return <Tiles model={model} className={className} />;
    if (placement === 'summary') return <Summary model={model} className={className} />;
    if (placement === 'facts') return <Fact model={model} />;

    return <Default className={className} />;
}
