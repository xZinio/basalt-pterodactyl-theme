import { useEffect, useId, useState } from 'react';
import { ArrowLeft, Pencil, Plus, Shapes, Trash2 } from 'lucide-react';
import { Button, Checkbox, Dialog, Input, Label, NamedIcon, cn } from '@pterodactyl/sdk';
import type { ServerListItem } from '@pterodactyl/sdk/theme';
import type { Folder } from '../../lib/api';
import { stateFill } from '../../lib/server';
import { useServerDrop } from './drag';

export const folderIcons = [
    'folder',
    'pickaxe',
    'swords',
    'heart',
    'gamepad-2',
    'star',
    'crown',
    'shield',
    'rocket',
    'flame',
    'zap',
    'globe',
    'castle',
    'trophy',
    'users',
    'sparkles',
] as const;

const dotFill = (item: ServerListItem | undefined) => stateFill(item?.state.kind === 'ready' ? item.state.power : null);

const toolButton =
    'inline-flex size-7 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:bg-foreground/[0.08] hover:text-foreground';

function FolderTile({
    folder,
    items,
    onOpen,
    onEdit,
    onManage,
    onDelete,
    onDropServer,
}: {
    folder: Folder;
    items: Map<string, ServerListItem>;
    onOpen: () => void;
    onEdit: () => void;
    onManage: () => void;
    onDelete: () => void;
    onDropServer: (uuid: string) => void;
}) {
    // A server dragged onto the folder joins it.
    const target = useServerDrop(onDropServer, (uuid) => !folder.servers.includes(uuid));

    return (
        <li
            {...target.props}
            data-over={target.over || undefined}
            className='group/folder surface basalt-lift basalt-folder relative flex h-[74px] min-w-0 items-center gap-3.5 p-4 transition-colors hover:border-primary/50'
        >
            <button type='button' onClick={onOpen} aria-label={`Open ${folder.name}`} className='absolute inset-0 z-0 cursor-pointer rounded-[inherit] border-0 bg-transparent' />
            <span className='basalt-folder-icon pointer-events-none flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/14 text-primary'>
                <NamedIcon name={folder.icon ?? 'folder'} size={20} aria-hidden />
            </span>
            <span className='pointer-events-none min-w-0 flex-1'>
                <span className='block truncate text-[15px] leading-[1.5] font-semibold text-foreground'>{folder.name}</span>
                <span className='mt-1.5 flex h-2 items-center gap-1'>
                    {folder.servers.slice(0, 10).map((uuid) => (
                        <span key={uuid} className={cn('size-2 rounded-full', dotFill(items.get(uuid)))} />
                    ))}
                </span>
            </span>
            <span className='pointer-events-none rounded-full bg-primary/16 px-2 text-xs leading-5 font-medium text-foreground transition-opacity group-hover/folder:opacity-0 pointer-coarse:hidden'>
                {folder.servers.length}
            </span>
            <span className='basalt-folder-actions absolute top-1/2 right-3 z-10 flex -translate-y-1/2 items-center gap-0.5 rounded-md bg-popover opacity-0 transition-opacity group-focus-within/folder:opacity-100 group-hover/folder:opacity-100 pointer-coarse:opacity-100'>
                <button type='button' className={toolButton} onClick={onManage} aria-label={`Choose the servers in ${folder.name}`} title='Servers'>
                    <Shapes className='size-3.5' aria-hidden />
                </button>
                <button type='button' className={toolButton} onClick={onEdit} aria-label={`Rename ${folder.name}`} title='Rename'>
                    <Pencil className='size-3.5' aria-hidden />
                </button>
                <button type='button' className={toolButton} onClick={onDelete} aria-label={`Delete ${folder.name}`} title='Delete'>
                    <Trash2 className='size-3.5' aria-hidden />
                </button>
            </span>
        </li>
    );
}

export function FolderRow({
    folders,
    items,
    onOpen,
    onCreate,
    onEdit,
    onManage,
    onDelete,
    onDropServer,
}: {
    folders: readonly Folder[];
    items: Map<string, ServerListItem>;
    onOpen: (folder: Folder) => void;
    onCreate: () => void;
    onEdit: (folder: Folder) => void;
    onManage: (folder: Folder) => void;
    onDelete: (folder: Folder) => void;
    onDropServer: (folder: Folder, uuid: string) => void;
}) {
    return (
        <ul className='basalt-folder-grid grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3'>
            {folders.map((folder) => (
                <FolderTile
                    key={folder.id}
                    folder={folder}
                    items={items}
                    onOpen={() => onOpen(folder)}
                    onEdit={() => onEdit(folder)}
                    onManage={() => onManage(folder)}
                    onDelete={() => onDelete(folder)}
                    onDropServer={(uuid) => onDropServer(folder, uuid)}
                />
            ))}
            <li className='basalt-lift min-w-0'>
                <button
                    type='button'
                    onClick={onCreate}
                    className='group/new basalt-folder-new flex h-[74px] w-full cursor-pointer items-center gap-3.5 rounded-lg border border-dashed border-border/70 bg-transparent p-4 text-left transition-colors hover:border-primary/60 hover:bg-primary/5'
                >
                    <span className='basalt-folder-icon flex size-10 shrink-0 items-center justify-center rounded-md border border-dashed border-primary/50 text-primary'>
                        <Plus className='size-5' aria-hidden />
                    </span>
                    <span className='text-[15px] leading-[1.5] font-semibold text-muted-foreground transition-colors group-hover/new:text-foreground'>New folder</span>
                </button>
            </li>
        </ul>
    );
}

/** The heading over an open folder's servers, with the way back to all of them, where a server dragged leaves the folder. */
export function OpenFolderBar({ folder, onClose, onDropOut }: { folder: Folder; onClose: () => void; onDropOut: (uuid: string) => void }) {
    const target = useServerDrop(onDropOut, (uuid) => folder.servers.includes(uuid));

    return (
        <div className='flex items-center gap-3'>
            <button
                type='button'
                onClick={onClose}
                {...target.props}
                data-over={target.over || undefined}
                className='basalt-folder-back inline-flex h-9 items-center gap-2 rounded-md border border-border bg-transparent px-3 text-sm text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground'
            >
                <ArrowLeft className='size-4' aria-hidden />
                All servers
            </button>
            <span className='flex size-8 items-center justify-center rounded-md bg-primary/14 text-primary'>
                <NamedIcon name={folder.icon ?? 'folder'} size={16} aria-hidden />
            </span>
            <h3 className='truncate text-lg font-semibold text-foreground'>{folder.name}</h3>
        </div>
    );
}

/** Name a folder and pick its icon, when creating or renaming it. */
export function FolderDialog({
    folder,
    open,
    onClose,
    onSave,
}: {
    folder: Folder | null;
    open: boolean;
    onClose: () => void;
    onSave: (name: string, icon: string) => void;
}) {
    const id = useId();
    const [name, setName] = useState('');
    const [icon, setIcon] = useState<string>('folder');

    useEffect(() => {
        if (open) {
            setName(folder?.name ?? '');
            setIcon(folder?.icon ?? 'folder');
        }
    }, [open, folder]);

    const valid = name.trim().length > 0 && name.trim().length <= 40;

    return (
        <Dialog open={open} onClose={onClose} title={folder ? 'Rename folder' : 'New folder'}>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    if (valid) onSave(name.trim(), icon);
                }}
                className='mb-6 flex flex-col gap-5'
            >
                <div>
                    <Label htmlFor={id}>Name</Label>
                    <Input id={id} value={name} maxLength={40} autoFocus onChange={(event) => setName(event.target.value)} />
                </div>
                <fieldset>
                    <Label as='legend'>Icon</Label>
                    <div className='mt-1 grid grid-cols-8 gap-2'>
                        {folderIcons.map((candidate) => (
                            <button
                                key={candidate}
                                type='button'
                                aria-pressed={icon === candidate}
                                aria-label={candidate.replace(/-\d+$/, '').replace('-', ' ')}
                                onClick={() => setIcon(candidate)}
                                className={cn(
                                    'flex aspect-square items-center justify-center rounded-md border bg-popover text-muted-foreground transition-colors hover:text-foreground',
                                    icon === candidate ? 'border-primary bg-primary/14 text-primary' : 'border-border'
                                )}
                            >
                                <NamedIcon name={candidate} size={18} aria-hidden />
                            </button>
                        ))}
                    </div>
                </fieldset>
                <div className='flex justify-end gap-2'>
                    <Button.Text size='small' onClick={onClose}>
                        Cancel
                    </Button.Text>
                    <Button size='small' type='submit' disabled={!valid}>
                        {folder ? 'Save' : 'Create'}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

/** Tick the servers that belong in a folder; a server sits in one folder at a time. */
export function ManageDialog({
    folder,
    items,
    open,
    onClose,
    onSave,
}: {
    folder: Folder | null;
    items: readonly ServerListItem[];
    open: boolean;
    onClose: () => void;
    onSave: (servers: string[]) => void;
}) {
    const [chosen, setChosen] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (open) setChosen(new Set(folder?.servers ?? []));
    }, [open, folder]);

    const toggle = (uuid: string) =>
        setChosen((current) => {
            const next = new Set(current);
            if (next.has(uuid)) next.delete(uuid);
            else next.add(uuid);
            return next;
        });

    return (
        <Dialog open={open} onClose={onClose} title={folder ? `Servers in ${folder.name}` : 'Servers'}>
            <ul className='mb-6 max-h-80 divide-y divide-border/70 overflow-y-auto rounded-md border border-border'>
                {items.map((item) => (
                    <li key={item.uuid}>
                        <label className='flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-foreground/[0.04]'>
                            <Checkbox checked={chosen.has(item.uuid)} onChange={() => toggle(item.uuid)} />
                            <span className='min-w-0 flex-1 truncate text-sm text-foreground'>{item.name}</span>
                        </label>
                    </li>
                ))}
            </ul>
            <div className='mb-6 flex justify-end gap-2'>
                <Button.Text size='small' onClick={onClose}>
                    Cancel
                </Button.Text>
                <Button size='small' onClick={() => onSave([...chosen])}>
                    Save
                </Button>
            </div>
        </Dialog>
    );
}
