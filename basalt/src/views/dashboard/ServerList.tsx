import { useMemo, useRef, useState, type DragEvent } from 'react';
import { FolderInput, Server as ServerIcon, Star } from 'lucide-react';
import {
    DropdownMenu,
    NamedIcon,
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
    type PanelDestination,
} from '@pterodactyl/sdk';
import { Slot, View, useThemeSettings, type ServerListItem, type ServerListModel, type ViewProps } from '@pterodactyl/sdk/theme';
import { usePlayers, usePreferences, useServerMeta, useUpdatePreferences, type Folder, type Preferences } from '../../lib/api';
import { useBilling } from '../../lib/billing';
import { fillLink, linkValues, type QuickAction } from '../../lib/content';
import { useFollow } from '../../lib/links';
import { useLocalState } from '../../lib/local';
import { useMotion } from '../../lib/motion';
import { consoleDestination, serverDestination, useServerDashboard } from '../../lib/server';
import type { ThemeSettings } from '../../theme-types';
import { DashboardDataContext } from './data';
import { SERVER_DRAG, carriesServer, setDraggedServer, useReflow } from './drag';
import { FolderDialog, FolderRow, ManageDialog, OpenFolderBar } from './Folders';
import { Field, NativeSelect, SearchInput, Welcome } from './parts';

type StatusFilter = 'all' | 'online' | 'offline';
type SortOrder = 'custom' | 'name' | 'status';

const online = (item: ServerListItem) => item.state.kind === 'ready' && item.state.power !== 'offline';
const statusRank = (item: ServerListItem) =>
    item.state.kind !== 'ready' ? 3 : item.state.power === 'running' ? 0 : item.state.power === 'offline' ? 2 : 1;

/** The server pages quick actions open, besides the console, which follows the server dashboard setting. */
const actionPages: Partial<Record<QuickAction['action'], string>> = {
    files: '/server/$id/files',
    backups: '/server/$id/backups',
    databases: '/server/$id/databases',
    schedules: '/server/$id/schedules',
    network: '/server/$id/network',
    startup: '/server/$id/startup',
    settings: '/server/$id/settings',
};

/**
 * The administrator's quick actions under a server card: its pages, links with the server's
 * values in them, and the upgrade page of its service when it has one.
 */
function QuickActions({ item, actions, upgrade }: { item: ServerListItem; actions: readonly QuickAction[]; upgrade: string | null }) {
    const follow = useFollow();
    const dashboard = useServerDashboard();
    if (actions.length === 0) return null;

    return (
        <div className='basalt-quick'>
            {actions.map((action) => {
                const content = (
                    <>
                        <NamedIcon name={action.icon || 'arrow-up-right'} size={14} aria-hidden />
                        <span>{action.label}</span>
                    </>
                );
                const page = action.action === 'console' ? null : actionPages[action.action];
                if (action.action === 'console' || page) {
                    const destination = page ? ({ to: page, params: { id: item.identifier } } as PanelDestination) : consoleDestination(item.identifier, dashboard);
                    return (
                        <PanelLink key={action.id} destination={destination} title={action.label} className='basalt-quick-action'>
                            {content}
                        </PanelLink>
                    );
                }
                const href = action.action === 'upgrade' ? upgrade : action.action === 'url' && action.url ? fillLink(action.url, linkValues(item.server)) : null;
                if (!href) return null;
                const blank = !href.startsWith('/');
                return (
                    <a
                        key={action.id}
                        href={href}
                        title={action.label}
                        target={blank ? '_blank' : undefined}
                        rel={blank ? 'noopener noreferrer' : undefined}
                        onClick={blank ? undefined : (event) => follow(event, href)}
                        className='basalt-quick-action'
                    >
                        {content}
                    </a>
                );
            })}
        </div>
    );
}

const cornerButton =
    'inline-flex size-8 cursor-pointer items-center justify-center rounded-(--basalt-control-radius) border-0 bg-transparent text-muted-foreground transition-[color,opacity,background-color] hover:bg-[color:color-mix(in_oklab,var(--foreground)_9%,transparent)] hover:text-foreground';

/** A drag through the user's own order: the server, the gap it leaves, the order and folder it would land in. */
interface Drag {
    readonly uuid: string;
    readonly height: number;
    readonly order: readonly string[];
    readonly folder: string | null;
    /** The server it last moved past; held over the same one, it stays put. */
    readonly last: string | null;
}

/** What a tile tells the list while it is dragged through the user's order. */
interface Sorter {
    readonly start: (uuid: string, height: number) => void;
    readonly hover: (uuid: string) => void;
    readonly end: () => void;
}

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
    actions,
    upgrade,
    favorite,
    folders,
    folderId,
    sorter,
    hidden,
    onFavorite,
    onMove,
    onNewFolder,
}: {
    item: ServerListItem;
    index: number;
    art: string | null;
    actions: readonly QuickAction[];
    /** Its service's upgrade page, for an Upgrade plan action. */
    upgrade: string | null;
    favorite: boolean | null;
    folders: readonly Folder[] | null;
    folderId: string | null;
    /** While the list is in the user's own order: dragging the server moves it there. */
    sorter: Sorter | null;
    /** The server being dragged keeps its element, out of sight, while a slot shows where it goes. */
    hidden?: boolean;
    onFavorite: () => void;
    onMove: (folder: string | null) => void;
    onNewFolder: () => void;
}) {
    const { server } = item;
    // Dragged into the user's order, or onto a folder.
    const draggable = sorter !== null || folders !== null;

    return (
        <li
            className='basalt-server basalt-lift'
            style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
            draggable={draggable || undefined}
            data-flip={item.uuid}
            data-hidden={hidden || undefined}
            data-sortable={sorter ? '' : undefined}
            data-movable={folders !== null || favorite !== null || undefined}
            data-favorite={favorite || undefined}
            data-art={art ? '' : undefined}
            onDragStart={
                draggable
                    ? (event) => {
                          event.dataTransfer.clearData();
                          event.dataTransfer.setData(SERVER_DRAG, item.uuid);
                          event.dataTransfer.effectAllowed = 'move';
                          const tile = event.currentTarget;
                          const box = tile.getBoundingClientRect();
                          event.dataTransfer.setDragImage(tile, event.clientX - box.left, event.clientY - box.top);
                          setDraggedServer(item.uuid);
                          // After the browser has taken its picture of the tile.
                          if (sorter) window.setTimeout(() => sorter.start(item.uuid, box.height), 0);
                          else tile.setAttribute('data-dragging', '');
                      }
                    : undefined
            }
            onDragEnd={
                draggable
                    ? (event) => {
                          event.currentTarget.removeAttribute('data-dragging');
                          setDraggedServer(null);
                          sorter?.end();
                      }
                    : undefined
            }
            onDragOver={
                sorter
                    ? (event) => {
                          if (!carriesServer(event)) return;
                          event.preventDefault();
                          event.dataTransfer.dropEffect = 'move';
                          sorter.hover(item.uuid);
                      }
                    : undefined
            }
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
            <PanelLink destination={serverDestination(item.identifier)} aria-label={item.name} draggable={draggable ? false : undefined} className='basalt-server-link'>
                <View name='dashboard.serverCard' server={server} />
            </PanelLink>
            <QuickActions item={item} actions={actions} upgrade={upgrade} />
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
    const players = usePlayers(preferences.content.players.cards ? uuids.filter((uuid) => meta[uuid]?.minecraft) : []);
    // The services of the servers, only while a quick action opens their upgrade page.
    const billing = useBilling(preferences.content.quickActions.some((action) => action.action === 'upgrade') ? uuids : []);

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
    const filtered = query.trim() !== '' || status !== 'all';

    // Dragging a server through the user's own order, while the list shows it unfiltered.
    const [drag, setDrag] = useState<Drag | null>(null);
    const dragging = useRef<Drag | null>(null);
    const lastMove = useRef(0);
    const list = useReflow<HTMLUListElement>(drag !== null, useMotion());
    const sortable = serverFavorites && preferences.loaded && sort === 'custom' && !filtered;

    const items = useMemo(() => {
        const term = query.trim().toLowerCase();
        const order = new Map((drag?.order ?? preferences.order).map((uuid, index) => [uuid, index]));
        const position = (item: ServerListItem) => order.get(item.uuid) ?? order.size + model.servers.indexOf(item);
        // The server being dragged is where the drag would leave it.
        const folderOfItem = (uuid: string) => (drag && uuid === drag.uuid ? drag.folder : (folderOf.get(uuid) ?? null));

        return model.servers
            .filter((item) => {
                if (term) {
                    const node = item.server.attributes.node ?? '';
                    if (![item.name, item.identifier, item.uuid, node].some((value) => value.toLowerCase().includes(term))) return false;
                } else if (folderOfItem(item.uuid) !== (opened?.id ?? null)) {
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
    }, [model.servers, query, status, sort, opened, folderOf, preferences.order, preferences.favorites, drag]);

    const saveFolders = (next: Folder[]) => update.mutate({ folders: next });
    // The folders with a server moved into `target`, or out of every folder for null.
    const foldersWith = (uuid: string, target: string | null): Folder[] =>
        folders.map((folder) => ({
            ...folder,
            servers: folder.id === target ? [...folder.servers.filter((candidate) => candidate !== uuid), uuid] : folder.servers.filter((candidate) => candidate !== uuid),
        }));
    const moveServer = (uuid: string, target: string | null) => saveFolders(foldersWith(uuid, target));

    // The user's own order of every server: as saved, then the rest as the panel lists them.
    const ownOrder = () => {
        const saved = new Map(preferences.order.map((uuid, index) => [uuid, index]));
        return model.servers
            .map((item, index) => ({ uuid: item.uuid, key: saved.get(item.uuid) ?? saved.size + index }))
            .sort((a, b) => a.key - b.key)
            .map((entry) => entry.uuid);
    };
    const track = (next: Drag | null) => {
        dragging.current = next;
        setDrag(next);
    };
    const sorter: Sorter | null = sortable
        ? {
              start: (uuid, height) => track({ uuid, height, order: ownOrder(), folder: folderOf.get(uuid) ?? null, last: null }),
              hover: (target) => {
                  const current = dragging.current;
                  if (!current || target === current.uuid || target === current.last || Date.now() - lastMove.current < 140) return;
                  // Starred servers stay above the rest.
                  if (favorites.has(target) !== favorites.has(current.uuid)) return;

                  const after = current.order.indexOf(current.uuid) < current.order.indexOf(target);
                  const order = current.order.filter((uuid) => uuid !== current.uuid);
                  const at = order.indexOf(target);
                  if (at < 0) return;
                  order.splice(after ? at + 1 : at, 0, current.uuid);
                  lastMove.current = Date.now();
                  track({ ...current, order, folder: foldersOn ? (folderOf.get(target) ?? null) : null, last: target });
              },
              end: () => track(null),
          }
        : null;

    /** Lands a drag: the order it made, and the folder it ends in, or `folder` when it was dropped on one. */
    const land = (folder?: string | null) => {
        const current = dragging.current;
        if (!current) return;
        track(null);

        const saved = preferences.order;
        const order = [...current.order, ...saved.filter((uuid) => !current.order.includes(uuid))].slice(0, 1000);
        const target = folder === undefined ? current.folder : folder;
        const patch: { -readonly [K in keyof Preferences]?: Preferences[K] } = {};
        if (order.join() !== saved.join()) patch.order = order;
        if (foldersOn && target !== (folderOf.get(current.uuid) ?? null)) patch.folders = foldersWith(current.uuid, target);
        if (patch.order || patch.folders) update.mutate(patch);
    };
    // A server dropped on a folder, or on the way out of one: moved there, in the order its drag made.
    const dropInto = (target: string | null, uuid: string) => {
        if (dragging.current) land(target);
        else if ((folderOf.get(uuid) ?? null) !== target) moveServer(uuid, target);
    };
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

    const shown = drag ? items.find((item) => item.uuid === drag.uuid) : undefined;

    return (
        <DashboardDataContext.Provider value={{ meta, players }}>
            <div className={cn('@container flex flex-col gap-4', className)}>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
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
                        <OpenFolderBar folder={opened} onClose={() => setOpenFolder(null)} onDropOut={(uuid) => dropInto(null, uuid)} />
                    ) : (
                        <FolderRow
                            folders={folders}
                            items={byUuid}
                            onOpen={(folder) => setOpenFolder(folder.id)}
                            onCreate={() => setEditing({ folder: null })}
                            onEdit={(folder) => setEditing({ folder })}
                            onManage={setManaging}
                            onDelete={deleteFolder}
                            onDropServer={(folder, uuid) => dropInto(folder.id, uuid)}
                        />
                    )
                )}

                {model.loading ? (
                    <Spinner centered size='large' />
                ) : items.length === 0 ? (
                    <NoServers model={model} filtered={filtered || opened !== null} />
                ) : (
                    <ul
                        ref={list}
                        className='basalt-servers'
                        onDragOver={
                            sorter
                                ? (event: DragEvent) => {
                                      if (!dragging.current || !carriesServer(event)) return;
                                      event.preventDefault();
                                      event.dataTransfer.dropEffect = 'move';
                                  }
                                : undefined
                        }
                        onDrop={
                            sorter
                                ? (event: DragEvent) => {
                                      if (!dragging.current) return;
                                      event.preventDefault();
                                      event.stopPropagation();
                                      land();
                                  }
                                : undefined
                        }
                    >
                        {items.map((item, index) =>
                            drag && item.uuid === drag.uuid ? (
                                <li
                                    key='basalt-slot'
                                    data-flip='basalt-slot'
                                    className='basalt-server-slot'
                                    style={{ height: drag.height }}
                                    onDragOver={(event) => {
                                        if (!carriesServer(event)) return;
                                        event.preventDefault();
                                        // Back over its own gap, it may pass the last server again.
                                        if (dragging.current?.last) dragging.current = { ...dragging.current, last: null };
                                    }}
                                />
                            ) : (
                                <ServerTile
                                    key={item.uuid}
                                    item={item}
                                    index={index}
                                    art={serverArt ? (meta[item.uuid]?.banner ?? null) : null}
                                    actions={preferences.content.quickActions}
                                    upgrade={billing.servers[item.uuid]?.upgrade_url ?? null}
                                    favorite={serverFavorites ? favorites.has(item.uuid) : null}
                                    folders={foldersOn ? folders : null}
                                    folderId={folderOf.get(item.uuid) ?? null}
                                    sorter={sorter}
                                    onFavorite={() => toggleFavorite(item.uuid)}
                                    onMove={(target) => moveServer(item.uuid, target)}
                                    onNewFolder={() => setEditing({ folder: null, moving: item.uuid })}
                                />
                            )
                        )}
                        {shown && (
                            <ServerTile
                                key={shown.uuid}
                                item={shown}
                                index={items.length}
                                art={serverArt ? (meta[shown.uuid]?.banner ?? null) : null}
                                actions={preferences.content.quickActions}
                                upgrade={billing.servers[shown.uuid]?.upgrade_url ?? null}
                                favorite={serverFavorites ? favorites.has(shown.uuid) : null}
                                folders={foldersOn ? folders : null}
                                folderId={folderOf.get(shown.uuid) ?? null}
                                sorter={sorter}
                                hidden
                                onFavorite={() => toggleFavorite(shown.uuid)}
                                onMove={(target) => moveServer(shown.uuid, target)}
                                onNewFolder={() => setEditing({ folder: null, moving: shown.uuid })}
                            />
                        )}
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
