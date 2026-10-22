import { useMemo, useState } from 'react';
import { Archive, Folder as FolderIcon, FolderInput, Server as ServerIcon, SquareTerminal, Star } from 'lucide-react';
import {
    DropdownMenu,
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    NewLinkButton,
    PanelLink,
    Pagination,
    Spinner,
    Switch,
    cn,
    useCurrentUser,
} from '@pterodactyl/sdk';
import { Slot, View, useThemeSettings, type ServerListItem, type ServerListModel, type ViewProps } from '@pterodactyl/sdk/theme';
import { usePlayers, usePreferences, useServerMeta, useUpdatePreferences, type Folder } from '../../lib/api';
import { useLocalState } from '../../lib/local';
import { consoleDestination, serverDestination, stateFill, useServerDashboard } from '../../lib/server';
import type { ThemeSettings } from '../../theme-types';
import { DashboardDataContext } from './data';
import { FolderDialog, FolderRow, ManageDialog, OpenFolderBar } from './Folders';
import { Announcement, Field, NativeSelect, SearchInput, Welcome } from './parts';

type StatusFilter = 'all' | 'online' | 'offline';
type SortOrder = 'custom' | 'name' | 'status';

const online = (item: ServerListItem) => item.state.kind === 'ready' && item.state.power !== 'offline';
const statusRank = (item: ServerListItem) =>
    item.state.kind !== 'ready' ? 3 : item.state.power === 'running' ? 0 : item.state.power === 'offline' ? 2 : 1;

// Two stretched buttons on a narrow card; up to three compact ones on a wide card.
const quickAction = cn(
    'inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md border border-border/80 bg-foreground/[0.04] px-2 text-xs leading-[1.5] font-medium text-muted-foreground no-underline backdrop-blur-[2px] transition-colors hover:bg-foreground/[0.08] hover:text-foreground',
    'card-wide:h-7 card-wide:flex-none card-wide:px-2.5'
);

const cornerButton =
    'inline-flex size-8 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground transition-[color,opacity] hover:text-foreground';

function ServerTile({
    item,
    index,
    art,
    favorite,
    folders,
    folderId,
    onFavorite,
    onMove,
    onNewFolder,
}: {
    item: ServerListItem;
    index: number;
    art: string | null;
    favorite: boolean;
    folders: readonly Folder[];
    folderId: string | null;
    onFavorite: () => void;
    onMove: (folder: string | null) => void;
    onNewFolder: () => void;
}) {
    const { server } = item;
    const params = { id: item.identifier };
    const consoleLink = consoleDestination(item.identifier, useServerDashboard());

    return (
        <li
            className={cn(
                'group/card surface basalt-lift @container relative flex min-w-0 flex-col overflow-hidden transition-[border-color,box-shadow,translate] duration-200',
                'hover:-translate-y-px hover:border-primary/50 hover:shadow-raised'
            )}
            style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
        >
            {art && (
                <img
                    src={art}
                    alt=''
                    loading='lazy'
                    className='pointer-events-none absolute inset-y-0 right-0 h-full w-[68%] object-cover opacity-[0.18] [mask-image:linear-gradient(to_right,transparent,black_70%)] card-wide:w-[55%] card-wide:opacity-[0.28] in-data-[basalt-server-art=false]:hidden'
                />
            )}
            <Slot name='dashboard.serverRow.before' data={server} />
            <PanelLink
                destination={serverDestination(item.identifier)}
                aria-label={item.name}
                className='relative block flex-1 p-4 pr-6 text-foreground no-underline card-wide:px-6 card-wide:py-5 card-wide:pr-10'
            >
                <View name='dashboard.serverCard' server={server} />
            </PanelLink>
            <div className='relative min-w-0 px-4 pb-4 empty:hidden'>
                <Slot name='dashboard.serverRow.metrics.after' data={server} />
            </div>
            <div className='relative -mt-2 flex flex-wrap gap-1.5 px-4 pb-4 max-md:hidden card-wide:px-6'>
                <PanelLink destination={consoleLink} className={quickAction}>
                    <SquareTerminal className='size-3.5' aria-hidden />
                    Console
                </PanelLink>
                <PanelLink destination={{ to: '/server/$id/files', params }} className={quickAction}>
                    <FolderIcon className='size-3.5' aria-hidden />
                    Files
                </PanelLink>
                <PanelLink destination={{ to: '/server/$id/backups', params }} className={cn(quickAction, 'hidden card-wide:inline-flex')}>
                    <Archive className='size-3.5' aria-hidden />
                    Backups
                </PanelLink>
            </div>
            <div className='relative min-w-0 px-4 pb-4 empty:hidden'>
                <Slot name='dashboard.serverRow.after' data={server} />
            </div>

            <div className='absolute top-3 right-5 flex items-center gap-0.5'>
                <DropdownMenu
                    triggerClassName={cn(cornerButton, 'opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100')}
                    triggerContent={
                        <>
                            <FolderInput className='size-[15px]' aria-hidden />
                            <span className='sr-only'>Move {item.name} to a folder</span>
                        </>
                    }
                >
                    {folders.map((folder) => (
                        <DropdownMenu.Item key={folder.id} checked={folder.id === folderId} onClick={() => onMove(folder.id === folderId ? null : folder.id)}>
                            {folder.name}
                        </DropdownMenu.Item>
                    ))}
                    {folderId && <DropdownMenu.Item onClick={() => onMove(null)}>Remove from folder</DropdownMenu.Item>}
                    <DropdownMenu.Item onClick={onNewFolder}>New folder…</DropdownMenu.Item>
                </DropdownMenu>
                <button
                    type='button'
                    onClick={onFavorite}
                    aria-pressed={favorite}
                    aria-label={favorite ? `Remove ${item.name} from favourites` : `Add ${item.name} to favourites`}
                    className={cn(cornerButton, favorite ? 'text-warning hover:text-warning' : 'opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100')}
                >
                    <Star className={cn('size-[15px]', favorite && 'fill-current')} aria-hidden />
                </button>
            </div>

            <span
                aria-hidden
                className={cn(
                    'absolute top-2 right-2 bottom-2 w-[5px] rounded-full',
                    stateFill(item.state.kind === 'ready' ? item.state.power : null)
                )}
            />
        </li>
    );
}

function NoServers({ model, filtered }: { model: ServerListModel; filtered: boolean }) {
    const others = model.scope === 'others';

    return (
        <Empty className='rounded-lg border border-dashed border-border/70 bg-card/40'>
            <EmptyHeader>
                <EmptyMedia variant='icon'>
                    <ServerIcon />
                </EmptyMedia>
                <EmptyTitle>{filtered ? 'No servers match' : others ? 'No other servers' : 'No servers yet'}</EmptyTitle>
                <EmptyDescription>
                    {filtered
                        ? 'Try another search, or show every status.'
                        : others
                          ? 'There are no servers owned by other users.'
                          : 'Servers you own or are invited to will appear here.'}
                </EmptyDescription>
            </EmptyHeader>
            {!filtered && model.canCreateServers && (
                <EmptyContent>
                    <NewLinkButton to='/panel/servers/new'>New server</NewLinkButton>
                </EmptyContent>
            )}
        </Empty>
    );
}

/** The dashboard: a greeting, a search and filter bar, the user's folders and their servers as cards. */
export default function ServerList({ model, className }: ViewProps<'dashboard.serverList'>) {
    const user = useCurrentUser();
    const { welcome } = useThemeSettings<ThemeSettings>();
    const preferences = usePreferences();
    const update = useUpdatePreferences();
    const [query, setQuery] = useState('');
    const [status, setStatus] = useLocalState<StatusFilter>('basalt.dashboard.status', 'all');
    const [sort, setSort] = useLocalState<SortOrder>('basalt.dashboard.sort', 'custom');
    const [openFolder, setOpenFolder] = useState<string | null>(null);
    const [editing, setEditing] = useState<{ folder: Folder | null; moving?: string } | null>(null);
    const [managing, setManaging] = useState<Folder | null>(null);

    const others = model.scope === 'others';
    const uuids = model.servers.map((item) => item.uuid);
    const meta = useServerMeta(uuids);
    const players = usePlayers(uuids.filter((uuid) => meta[uuid]?.minecraft));

    const folders = others ? [] : preferences.folders;
    const folderOf = useMemo(() => {
        const map = new Map<string, string>();
        for (const folder of folders) for (const uuid of folder.servers) map.set(uuid, folder.id);
        return map;
    }, [folders]);
    const byUuid = useMemo(() => new Map(model.servers.map((item) => [item.uuid, item])), [model.servers]);
    const favorites = new Set(preferences.favorites);
    const opened = folders.find((folder) => folder.id === openFolder) ?? null;

    const items = useMemo(() => {
        const term = query.trim().toLowerCase();
        const order = new Map(preferences.order.map((uuid, index) => [uuid, index]));
        const position = (item: ServerListItem) => order.get(item.uuid) ?? order.size + model.servers.indexOf(item);

        return model.servers
            .filter((item) => {
                if (term) {
                    const node = item.server.attributes.node ?? '';
                    if (![item.name, item.identifier, item.uuid, node].some((value) => value.toLowerCase().includes(term))) return false;
                } else if (opened) {
                    if (!opened.servers.includes(item.uuid)) return false;
                } else if (folderOf.has(item.uuid)) {
                    return false;
                }
                if (status === 'online') return online(item);
                if (status === 'offline') return !online(item);
                return true;
            })
            .sort((a, b) => {
                if (sort === 'name') return a.name.localeCompare(b.name);
                if (sort === 'status') return statusRank(a) - statusRank(b) || a.name.localeCompare(b.name);
                const fav = Number(favorites.has(b.uuid)) - Number(favorites.has(a.uuid));
                return fav || position(a) - position(b);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [model.servers, query, status, sort, opened, folderOf, preferences.order, preferences.favorites]);

    const saveFolders = (next: Folder[]) => update.mutate({ folders: next });
    const moveServer = (uuid: string, target: string | null) =>
        saveFolders(
            folders.map((folder) => ({
                ...folder,
                servers: folder.id === target ? [...folder.servers.filter((candidate) => candidate !== uuid), uuid] : folder.servers.filter((candidate) => candidate !== uuid),
            }))
        );
    const toggleFavorite = (uuid: string) =>
        update.mutate({ favorites: favorites.has(uuid) ? preferences.favorites.filter((candidate) => candidate !== uuid) : [...preferences.favorites, uuid] });

    const saveFolder = (name: string, icon: string) => {
        if (editing?.folder) {
            saveFolders(folders.map((folder) => (folder.id === editing.folder!.id ? { ...folder, name, icon } : folder)));
        } else {
            const id = `f${Date.now().toString(36)}`;
            const servers = editing?.moving ? [editing.moving] : [];
            saveFolders([
                ...folders.map((folder) => ({ ...folder, servers: folder.servers.filter((uuid) => !servers.includes(uuid)) })),
                { id, name, icon, servers },
            ]);
        }
        setEditing(null);
    };
    const saveMembers = (servers: string[]) => {
        if (!managing) return;
        saveFolders(
            folders.map((folder) =>
                folder.id === managing.id ? { ...folder, servers } : { ...folder, servers: folder.servers.filter((uuid) => !servers.includes(uuid)) }
            )
        );
        setManaging(null);
    };
    const deleteFolder = (target: Folder) => {
        if (openFolder === target.id) setOpenFolder(null);
        saveFolders(folders.filter((folder) => folder.id !== target.id));
    };

    const filtered = query.trim() !== '' || status !== 'all';

    return (
        <DashboardDataContext.Provider value={{ meta, players }}>
            <div className={cn('@container flex flex-col gap-4', className)}>
                <Announcement />
                <div className='flex flex-col gap-4 sm:mt-2 sm:flex-row sm:items-center sm:justify-between sm:first:mt-0'>
                    <h1 className='text-3xl leading-9 font-semibold text-foreground'>Servers</h1>
                    {model.canViewOthers && (
                        <Switch
                            checked={others}
                            onChange={() => model.actions.setScope(others ? 'mine' : 'others')}
                            label={others ? "Showing others' servers" : 'Showing your servers'}
                            controlPosition='end'
                            className='gap-4 self-start sm:self-auto'
                        />
                    )}
                </div>
                {welcome && !others && <Welcome name={user.username} />}
                <Slot name='dashboard.before' />
                <div className='surface flex flex-col gap-3 px-5 pt-4 pb-5 @3xl:flex-row @3xl:items-end'>
                    <Field label='Search servers' className='flex-1'>
                        {(id) => <SearchInput id={id} value={query} onChange={setQuery} placeholder='Name, identifier, or node' />}
                    </Field>
                    <Field label='Status' className='@3xl:w-[91px]'>
                        {(id) => <NativeSelect id={id} value={status} onChange={setStatus} options={{ all: 'All', online: 'Online', offline: 'Offline' }} />}
                    </Field>
                    <Field label='Sort by' className='@3xl:w-[143px]'>
                        {(id) => (
                            <NativeSelect id={id} value={sort} onChange={setSort} options={{ custom: 'Custom order', name: 'Name', status: 'Status' }} />
                        )}
                    </Field>
                </div>

                {!others && !query.trim() && (
                    opened ? (
                        <OpenFolderBar folder={opened} onClose={() => setOpenFolder(null)} />
                    ) : (
                        <FolderRow
                            folders={folders}
                            items={byUuid}
                            onOpen={(folder) => setOpenFolder(folder.id)}
                            onCreate={() => setEditing({ folder: null })}
                            onEdit={(folder) => setEditing({ folder })}
                            onManage={setManaging}
                            onDelete={deleteFolder}
                        />
                    )
                )}

                {model.loading ? (
                    <Spinner centered size='large' />
                ) : items.length === 0 ? (
                    <NoServers model={model} filtered={filtered || opened !== null} />
                ) : (
                    <ul className='grid grid-cols-1 gap-4 min-[900px]:grid-cols-2'>
                        {items.map((item, index) => (
                            <ServerTile
                                key={item.uuid}
                                item={item}
                                index={index}
                                art={meta[item.uuid]?.banner ?? null}
                                favorite={favorites.has(item.uuid)}
                                folders={folders}
                                folderId={folderOf.get(item.uuid) ?? null}
                                onFavorite={() => toggleFavorite(item.uuid)}
                                onMove={(target) => moveServer(item.uuid, target)}
                                onNewFolder={() => setEditing({ folder: null, moving: item.uuid })}
                            />
                        ))}
                    </ul>
                )}

                {model.pagination && model.pagination.totalPages > 1 && (
                    <Pagination
                        data={{
                            data: [...model.servers],
                            meta: {
                                pagination: {
                                    total: model.pagination.total,
                                    count: model.pagination.count,
                                    per_page: model.pagination.perPage,
                                    current_page: model.pagination.currentPage,
                                    total_pages: model.pagination.totalPages,
                                },
                            },
                        }}
                        onPageSelect={model.actions.setPage}
                    >
                        {() => null}
                    </Pagination>
                )}
                <Slot name='dashboard.after' />
            </div>

            <FolderDialog folder={editing?.folder ?? null} open={editing !== null} onClose={() => setEditing(null)} onSave={saveFolder} />
            <ManageDialog folder={managing} items={model.servers} open={managing !== null} onClose={() => setManaging(null)} onSave={saveMembers} />
        </DashboardDataContext.Provider>
    );
}
