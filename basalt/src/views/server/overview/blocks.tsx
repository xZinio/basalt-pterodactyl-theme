import { Fragment, useEffect, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    Archive,
    CalendarClock,
    CircleAlert,
    CircleCheck,
    Database,
    Fingerprint,
    Folder,
    Hash,
    Info,
    KeyRound,
    MapPin,
    Network,
    NotebookPen,
    Package,
    Rocket,
    Server as ServerIcon,
    Settings,
    SquareTerminal,
    TriangleAlert,
    Zap,
} from 'lucide-react';
import { PanelLink, type PanelDestination, type SdkServer } from '@pterodactyl/sdk';
import { View, useNavigation } from '@pterodactyl/sdk/theme';
import Flag, { countryName } from '../../../components/Flag';
import { usePreferences, useSaveNote, type ServerMeta } from '../../../lib/api';
import type { Block, NoticeTone } from '../../../lib/blocks';
import { Markdown } from '../../../lib/markdown';
import { consoleDestination } from '../../../lib/server';
import { StatsItems, StatsPlacement } from '../../shell/context';
import { Chip, CopyButton, FactRow, Facts, Pill, Section } from './parts';

type Attributes = SdkServer['attributes'];

/** The Banner block: the server's name and how it is doing, over the egg's image or the Banner image setting. */
export function Banner({ name, image, height }: { name: string; image: string | null; height: Block['height'] }) {
    return (
        <section className='basalt-sd-banner' data-height={height ?? 'medium'} data-image={image ? '' : undefined}>
            {image && <img className='basalt-sd-banner-art' src={image} alt='' aria-hidden fetchPriority='high' decoding='async' />}
            <div className='basalt-sd-banner-text'>
                <h2>{name}</h2>
                <p>
                    <StatsPlacement.Provider value='summary'>
                        <View name='server.stats' />
                    </StatsPlacement.Provider>
                </p>
            </div>
        </section>
    );
}

/** The Stat tiles block: the live tiles it lists. */
export function Stats({ items }: { items: readonly string[] }) {
    return (
        <StatsItems.Provider value={items}>
            <StatsPlacement.Provider value='cards'>
                <View name='server.stats' />
            </StatsPlacement.Provider>
        </StatsItems.Provider>
    );
}

/** A row of the server information that the live model draws: its status, uptime or address. */
function LiveFact({ item }: { item: string }) {
    return (
        <StatsItems.Provider value={[item]}>
            <StatsPlacement.Provider value='facts'>
                <View name='server.stats' />
            </StatsPlacement.Provider>
        </StatsItems.Provider>
    );
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** The Server information block: the rows it lists, in their order. A row with nothing to show is left out. */
export function ServerInfo({ items, server, meta }: { items: readonly string[]; server: Attributes; meta: ServerMeta | undefined }) {
    const limits = server.feature_limits;
    const rows: Record<string, ReactNode> = {
        status: <LiveFact item='status' />,
        uptime: <LiveFact item='uptime' />,
        address: <LiveFact item='address' />,
        node: (
            <FactRow icon={ServerIcon} label='Node'>
                <Chip>{server.node}</Chip>
            </FactRow>
        ),
        ...(meta?.location && {
            location: (
                <FactRow icon={MapPin} label='Location'>
                    {meta.flag && <Flag code={meta.flag} />}
                    <span className='truncate'>{meta.flag ? countryName(meta.flag) : meta.location}</span>
                </FactRow>
            ),
        }),
        id: (
            <FactRow icon={Hash} label='Server ID'>
                <Chip>{server.identifier}</Chip>
                <CopyButton text={server.identifier} label='Copy the server ID' />
            </FactRow>
        ),
        uuid: (
            <FactRow icon={Fingerprint} label='Server UUID'>
                <Chip>{server.uuid}</Chip>
                <CopyButton text={server.uuid} label='Copy the server UUID' />
            </FactRow>
        ),
        image: (
            <FactRow icon={Package} label='Docker image'>
                <Chip>{server.docker_image}</Chip>
            </FactRow>
        ),
        limits: (
            <FactRow icon={Database} label='Limits'>
                <span className='flex flex-wrap justify-end gap-1.5'>
                    <Pill>{plural(limits.databases ?? 0, 'database', 'databases')}</Pill>
                    <Pill>{plural(limits.backups ?? 0, 'backup', 'backups')}</Pill>
                    <Pill>{plural(limits.allocations ?? 0, 'port', 'ports')}</Pill>
                </span>
            </FactRow>
        ),
    };

    return (
        <Section icon={Info} title='Server information'>
            <Facts>
                {items
                    .filter((item) => item in rows)
                    .map((item) => (
                        <Fragment key={item}>{rows[item]}</Fragment>
                    ))}
            </Facts>
        </Section>
    );
}

/** The server's pages the Quick actions block links to: its item, the page's navigation item, and the page. */
const actions: readonly [item: string, id: string, label: string, icon: LucideIcon, to: string][] = [
    ['console', 'index', 'Console', SquareTerminal, '/server/$id'],
    ['files', 'files', 'Files', Folder, '/server/$id/files'],
    ['databases', 'databases', 'Databases', Database, '/server/$id/databases'],
    ['backups', 'backups', 'Backups', Archive, '/server/$id/backups'],
    ['schedules', 'schedules', 'Schedules', CalendarClock, '/server/$id/schedules'],
    ['network', 'network', 'Network', Network, '/server/$id/network'],
    ['startup', 'startup', 'Startup', Rocket, '/server/$id/startup'],
    ['settings', 'settings', 'Settings', Settings, '/server/$id/settings'],
];

/** The Quick actions block: the server's pages it lists that the user may open, in its order. */
export function QuickActions({ items, server }: { items: readonly string[]; server: Attributes }) {
    const navigation = useNavigation('server');
    // The panel's own server pages the user may open: the navigation leaves out the others.
    const allowed = new Set(navigation.items.filter((item) => item.extensionId === undefined).map((item) => item.id));
    const params = { id: server.identifier };
    const destination = (id: string, to: string): PanelDestination =>
        id === 'index' ? consoleDestination(server.identifier, true) : ({ to, params } as PanelDestination);
    const shown = items.flatMap((item) => actions.filter(([own, id]) => own === item && allowed.has(id)));

    return (
        <Section icon={Zap} title='Quick actions'>
            <div className='grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2.5 px-5 pt-4 pb-5'>
                {shown.map(([item, id, label, Icon, to]) => (
                    <PanelLink
                        key={item}
                        destination={destination(id, to)}
                        className='flex min-w-0 items-center gap-2.5 rounded-md border border-border/80 bg-foreground/[0.03] px-3.5 py-3 text-sm leading-[1.5] font-semibold text-foreground no-underline transition-colors hover:border-primary/50 hover:bg-primary/10'
                    >
                        <Icon className='size-[18px] shrink-0 text-primary' aria-hidden />
                        <span className='truncate'>{label}</span>
                    </PanelLink>
                ))}
            </div>
        </Section>
    );
}

/** The SFTP details block, for users who may use SFTP. */
export function Sftp({ server, username }: { server: Attributes; username: string }) {
    const address = `sftp://${server.sftp_details.ip}:${server.sftp_details.port}`;
    const user = `${username}.${server.identifier}`;

    return (
        <Section icon={KeyRound} title='SFTP details'>
            <Facts>
                <FactRow icon={Network} label='Server Address'>
                    <Chip sensitive>{address}</Chip>
                    <CopyButton text={address} label='Copy the SFTP address' />
                </FactRow>
                <FactRow icon={Hash} label='Username'>
                    <Chip>{user}</Chip>
                    <CopyButton text={user} label='Copy the SFTP username' />
                </FactRow>
            </Facts>
        </Section>
    );
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const saveStates: Record<SaveState, string> = { idle: '', saving: 'Saving', saved: 'Saved', error: 'Could not be saved.' };

/** The Notes block: the user's own note on the server, saved a moment after they stop typing. */
export function Notes({ server }: { server: string }) {
    const preferences = usePreferences();
    const save = useSaveNote();
    const saved = preferences.notes[server] ?? '';
    // What is typed, until it is saved and the preferences hold it.
    const [typed, setTyped] = useState<string | null>(null);
    const [state, setState] = useState<SaveState>('idle');
    const { mutateAsync } = save;

    useEffect(() => {
        if (typed === null || typed === saved) return;

        const timer = window.setTimeout(() => {
            setState('saving');
            mutateAsync({ server, text: typed }).then(
                () => setState('saved'),
                () => setState('error')
            );
        }, 800);
        return () => window.clearTimeout(timer);
    }, [typed, saved, server, mutateAsync]);

    if (!preferences.loaded) return null;

    return (
        <Section
            icon={NotebookPen}
            title='Notes'
            aside={
                <span role='status' className='ml-auto text-xs leading-[1.5] text-muted-foreground'>
                    {saveStates[state]}
                </span>
            }
        >
            <textarea
                className='basalt-notes-input'
                value={typed ?? saved}
                maxLength={5000}
                placeholder='Only you can see these notes.'
                aria-label='Notes'
                onChange={(event) => {
                    setTyped(event.currentTarget.value);
                    setState('idle');
                }}
            />
        </Section>
    );
}

const toneIcons: Record<NoticeTone, LucideIcon> = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleAlert };

/** The Notice block: the administrator's own title and text, on a card with a bar of its tone. */
export function Notice({ block }: { block: Block }) {
    if (!block.title && !block.text) return null;

    const tone = block.tone ?? 'info';
    const Icon = toneIcons[tone];

    return (
        <div className='basalt-notice basalt-announcement' data-type={tone} data-style='card'>
            <Icon className='basalt-announcement-icon size-[18px]' aria-hidden />
            <div className='min-w-0 flex-1'>
                {block.title && <p className='basalt-announcement-title'>{block.title}</p>}
                {block.text && <Markdown className='basalt-announcement-body' text={block.text} />}
            </div>
        </div>
    );
}
