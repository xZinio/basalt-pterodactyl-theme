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
import { consoleDestination, serverDestination, useServerDashboard } from '../../lib/server';
import type { ThemeSettings } from '../../theme-types';
import { DashboardDataContext } from './data';
import { FolderDialog, FolderRow, ManageDialog, OpenFolderBar } from './Folders';
import { Announcement, Field, NativeSelect, SearchInput, Welcome } from './parts';

type StatusFilter = 'all' | 'online' | 'offline';
type SortOrder = 'custom' | 'name' | 'status';

const online = (item: ServerListItem) => item.state.kind === 'ready' && item.state.power !== 'offline';
const statusRank = (item: ServerListItem) =>
    item.state.kind !== 'ready' ? 3 : item.state.power === 'running' ? 0 : item.state.power === 'offline' ? 2 : 1;

const cornerButton =
    'inline-flex size-8 cursor-pointer items-center justify-center rounded-(--basalt-control-radius) border-0 bg-transparent text-muted-foreground transition-[color,opacity,background-color] hover:bg-[color:color-mix(in_oklab,var(--foreground)_9%,transparent)] hover:text-foreground';

/** A server's power for its status rail: grey while it is loading or out of reach. */
const powerOf = (item: ServerListItem) => (item.state.kind === 'ready' ? item.state.power : item.state.kind === 'loading' ? 'loading' : 'unavailable');

/**
 * One server of the overview, laid out by the Server layout and Server card settings: its card, a
 * picture of its egg, the shortcuts under it, its status rail, and the tools to move it into a
 * folder or star it, while those are on.
 */
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
    favorite: boolean | null;
    folders: readonly Folder[] | null;
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
            className='basalt-server basalt-lift'
            style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
            data-movable={folders !== null || favorite !== null || undefined}
            data-favorite={favorite || undefined}
            data-art={art ? '' : undefined}
        >
            {art && <img src={art} alt='' aria-hidden loading={index < 2 ? 'eager' : 'lazy'} decoding='async' className='basalt-server-art' />}
            <div className='basalt-row-tools'>
                {folders !== null && (
                    <DropdownMenu
                        triggerClassName={cn(cornerButton, 'basalt-move')}
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
                )}
                {favorite !== null && (
                    <button
                        type='button'
                        onClick={onFavorite}
                        aria-pressed={favorite}
                        aria-label={favorite ? `Remove ${item.name} from favourites` : `Add ${item.name} to favourites`}
                        className={cn(cornerButton, 'basalt-star')}
                    >
                        <Star className={cn('size-[15px]', favorite && 'fill-current')} aria-hidden />
                    </button>
                )}
            </div>
            <Slot name='dashboard.serverRow.before' data={server} />
            <PanelLink destination={serverDestination(item.identifier)} aria-label={item.name} className='basalt-server-link'>
                <View name='dashboard.serverCard' server={server} />
            </PanelLink>
            <div className='basalt-quick'>
                <PanelLink destination={consoleLink} className='basalt-quick-action'>
                    <SquareTerminal className='size-3.5' aria-hidden />
                    <span>Console</span>
                </PanelLink>
                <PanelLink destination={{ to: '/server/$id/files', params }} className='basalt-quick-action'>
                    <FolderIcon className='size-3.5' aria-hidden />
                    <span>Files</span>
                </PanelLink>
                <PanelLink destination={{ to: '/server/$id/backups', params }} className='basalt-quick-action'>
                    <Archive className='size-3.5' aria-hidden />
                    <span>Backups</span>
                </PanelLink>
            </div>
            <div className='basalt-server-extra'>
                <Slot name='dashboard.serverRow.metrics.after' data={server} />
                <Slot name='dashboard.serverRow.after' data={server} />
            </div>
            <span aria-hidden className='basalt-status' data-power={powerOf(item)} />
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

/**
 * The overview: a greeting and a search and filter bar by the Header setting, the user's folders
 * and their servers, starred ones first, while the Server folders and Favorites settings allow them.
 */
export default function ServerList({ model, className }: ViewProps<'dashboard.serverList'>) {
    const user = useCurrentUser();
    const { overviewHeader, serverFolders, serverFavorites, serverArt } = useThemeSettings<ThemeSettings>();
    const preferences = usePreferences();
    const update = useUpdatePreferences();
    const [typed, setQuery] = useState('');
    const [chosenStatus, setStatus] = useLocalState<StatusFilter>('basalt.dashboard.status', 'all');
    const [chosenSort, setSort] = useLocalState<SortOrder>('basalt.dashboard.sort', 'custom');
    // Without the search bar, nothing it keeps filters or sorts the list.
    const toolbar = overviewHeader !== 'minimal';
    const query = toolbar ? typed : '';
    const status = toolbar ? chosenStatus : 'all';
    const sort = toolbar ? chosenSort : 'custom';
    const [openFolder, setOpenFolder] = useState<string | null>(null);
    const [editing, setEditing] = useState<{ folder: Folder | null; moving?: string } | null>(null);
    const [managing, setManaging] = useState<Folder | null>(null);

    const others = model.scope === 'others';
    const uuids = model.servers.map((item) => item.uuid);
    const meta = useServerMeta(uuids);
    const players = usePlayers(uuids.filter((uuid) => meta[uuid]?.minecraft));

    const foldersOn = serverFolders && !others;
    const folders = foldersOn ? preferences.folders : [];
    const folderOf = useMemo(() => {
        const map = new Map<string, string>();
        for (const folder of folders) for (const uuid of folder.servers) map.set(uuid, folder.id);
        return map;
    }, [folders]);
    const byUuid = useMemo(() => new Map(model.servers.map((item) => [item.uuid, item])), [model.servers]);
    const favorites = new Set(serverFavorites ? preferences.favorites : []);
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
                {overviewHeader === 'standard' && !others && <Welcome name={user.username} />}
                <Slot name='dashboard.before' />
                {toolbar && (
                    <div className='surface flex flex-col gap-3 px-5 pt-4 pb-5 md:flex-row md:items-end'>
                        <Field label='Search servers' className='flex-1'>
                            {(id) => <SearchInput id={id} value={query} onChange={setQuery} placeholder='Name, identifier, or node' />}
                        </Field>
                        <Field label='Status' className='md:w-[91px]'>
                            {(id) => <NativeSelect id={id} value={status} onChange={setStatus} options={{ all: 'All', online: 'Online', offline: 'Offline' }} />}
                        </Field>
                        <Field label='Sort by' className='md:w-[143px]'>
                            {(id) => (
                                <NativeSelect id={id} value={sort} onChange={setSort} options={{ custom: 'Custom order', name: 'Name', status: 'Status' }} />
                            )}
                        </Field>
                    </div>
                )}

                {foldersOn && !query.trim() && (
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
                    <ul className='basalt-servers'>
                        {items.map((item, index) => (
                            <ServerTile
                                key={item.uuid}
                                item={item}
                                index={index}
                                art={serverArt ? (meta[item.uuid]?.banner ?? null) : null}
                                favorite={serverFavorites ? favorites.has(item.uuid) : null}
                                folders={foldersOn ? folders : null}
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
