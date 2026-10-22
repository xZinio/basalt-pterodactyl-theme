import type { LucideIcon } from 'lucide-react';
import {
    Archive,
    CalendarClock,
    Container,
    Database,
    Fingerprint,
    Folder,
    Gauge,
    Hash,
    Info,
    KeyRound,
    MapPin,
    Network,
    Rocket,
    Server as ServerIcon,
    Settings,
    SquareTerminal,
    User,
    Zap,
} from 'lucide-react';
import { PanelLink, ServerContentBlock, cn, useCurrentServer, useCurrentUser, type PanelDestination } from '@pterodactyl/sdk';
import { View, useNavigation } from '@pterodactyl/sdk/theme';
import Flag, { countryName } from '../components/Flag';
import { usePlayers, useServerMeta } from '../lib/api';
import { StatsPlacement } from '../views/shell/context';
import ServerHeader from '../views/server/ServerHeader';
import { Chip, CopyButton, FactRow, Facts, Pill, Section } from '../views/server/overview/parts';

const actions: readonly [id: string, label: string, icon: LucideIcon, to: string][] = [
    ['index', 'Console', SquareTerminal, '/server/$id'],
    ['files', 'Files', Folder, '/server/$id/files'],
    ['databases', 'Databases', Database, '/server/$id/databases'],
    ['backups', 'Backups', Archive, '/server/$id/backups'],
    ['schedules', 'Schedules', CalendarClock, '/server/$id/schedules'],
    ['network', 'Network', Network, '/server/$id/network'],
    ['startup', 'Startup', Rocket, '/server/$id/startup'],
    ['settings', 'Settings', Settings, '/server/$id/settings'],
];

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** The server's landing page: a banner, its live usage and graphs, its details and shortcuts to its pages. */
export default function ServerOverview() {
    const server = useCurrentServer();
    const user = useCurrentUser();
    const navigation = useNavigation('server');
    const uuid = server?.attributes.uuid ?? '';
    const meta = useServerMeta(uuid ? [uuid] : [])[uuid];
    const players = usePlayers(meta?.minecraft ? [uuid] : [])[uuid];

    if (!server) return null;

    const { attributes } = server;
    const allowed = new Set(navigation.items.filter((item) => item.extensionId === undefined).map((item) => item.id));
    const params = { id: attributes.identifier };
    const sftp = `sftp://${attributes.sftp_details.ip}:${attributes.sftp_details.port}`;
    const sftpUser = `${user.username}.${attributes.identifier}`;
    const limits = attributes.feature_limits;

    return (
        <ServerContentBlock title='Dashboard'>
            <ServerHeader name={attributes.name} description={attributes.description} />

            <section
                className={cn(
                    'surface relative isolate flex min-h-48 items-end overflow-hidden p-7 pt-10',
                    !meta?.banner && 'bg-[radial-gradient(120%_140%_at_100%_0%,color-mix(in_oklab,var(--primary)_32%,transparent),transparent_60%),linear-gradient(135deg,var(--card),var(--popover))]'
                )}
            >
                {meta?.banner && <img src={meta.banner} alt='' className='absolute inset-0 -z-10 size-full object-cover' />}
                <div className='absolute inset-0 -z-10 bg-linear-to-t from-black/70 via-black/25 to-transparent' />
                <div className='min-w-0'>
                    <h2 className='truncate text-[32px] leading-[1.1] font-bold text-white'>{attributes.name}</h2>
                    <p className='mt-1 text-[15px] leading-[1.375] text-white/95'>
                        <StatsPlacement.Provider value='summary'>
                            <View name='server.stats' />
                        </StatsPlacement.Provider>
                        {players && ` · ${players.online} of ${players.max} players online`}
                    </p>
                </div>
            </section>

            <StatsPlacement.Provider value='cards'>
                <View name='server.stats' className='mt-4' />
            </StatsPlacement.Provider>

            <View name='server.graphs' className='mt-4' />

            <div className='mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-2'>
                <Section icon={Info} title='Server information'>
                    <Facts>
                        <StatsPlacement.Provider value='facts'>
                            <View name='server.stats' />
                        </StatsPlacement.Provider>
                        <FactRow icon={ServerIcon} label='Node'>
                            <Chip>{attributes.node}</Chip>
                        </FactRow>
                        {meta?.location && (
                            <FactRow icon={MapPin} label='Location'>
                                {meta.flag && <Flag code={meta.flag} />}
                                <span className='truncate'>{meta.flag ? countryName(meta.flag) : meta.location}</span>
                            </FactRow>
                        )}
                        <FactRow icon={Hash} label='Server ID'>
                            <Chip>{attributes.identifier}</Chip>
                            <CopyButton text={attributes.identifier} label='Copy the server ID' />
                        </FactRow>
                        <FactRow icon={Fingerprint} label='Server UUID'>
                            <Chip>{attributes.uuid}</Chip>
                            <CopyButton text={attributes.uuid} label='Copy the server UUID' />
                        </FactRow>
                        <FactRow icon={Container} label='Docker image'>
                            <Chip>{attributes.docker_image}</Chip>
                        </FactRow>
                        <FactRow icon={Gauge} label='Limits'>
                            <span className='flex flex-wrap justify-end gap-1.5'>
                                <Pill>{plural(limits.databases ?? 0, 'database', 'databases')}</Pill>
                                <Pill>{plural(limits.backups ?? 0, 'backup', 'backups')}</Pill>
                                <Pill>{plural(limits.allocations ?? 0, 'port', 'ports')}</Pill>
                            </span>
                        </FactRow>
                    </Facts>
                </Section>

                <div className='flex min-w-0 flex-col gap-4'>
                    <Section icon={Zap} title='Quick actions'>
                        <div className='grid grid-cols-2 gap-2.5 p-5 sm:grid-cols-3'>
                            {actions
                                .filter(([id]) => allowed.has(id))
                                .map(([id, label, Icon, to]) => (
                                    <PanelLink
                                        key={id}
                                        destination={{ to, params } as PanelDestination}
                                        className='flex min-w-0 items-center gap-2.5 rounded-md border border-border/80 bg-foreground/[0.03] px-3.5 py-3 text-sm leading-[1.5] font-semibold text-foreground no-underline transition-colors hover:border-primary/50 hover:bg-primary/10'
                                    >
                                        <Icon className='size-[18px] shrink-0 text-primary' aria-hidden />
                                        <span className='truncate'>{label}</span>
                                    </PanelLink>
                                ))}
                        </div>
                    </Section>

                    <Section icon={KeyRound} title='SFTP details'>
                        <Facts>
                            <FactRow icon={Network} label='Server Address'>
                                <Chip sensitive>{sftp}</Chip>
                                <CopyButton text={sftp} label='Copy the SFTP address' />
                            </FactRow>
                            <FactRow icon={User} label='Username'>
                                <Chip>{sftpUser}</Chip>
                                <CopyButton text={sftpUser} label='Copy the SFTP username' />
                            </FactRow>
                        </Facts>
                    </Section>
                </div>
            </div>
        </ServerContentBlock>
    );
}
