import { useEffect, useId, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChartArea, ChevronDown, CreditCard, GripVertical, Image, Info, KeyRound, LayoutGrid, Megaphone, NotebookPen, PanelTop, Plus, Trash2, Zap } from 'lucide-react';
import { cn } from '@pterodactyl/sdk';
import { BLOCK_TYPES, MAX_BLOCKS, itemsOf, newBlock, parseLayout, serializeLayout, type Block, type BlockType, type BlockWidth } from '../../../lib/blocks';
import { Segmented, controlClass } from './Fields';
import type { Setting, SettingValue } from './model';

/** Each block as the studio names it, its icon, and what it shows. */
const kinds: Record<BlockType, { readonly name: string; readonly icon: LucideIcon; readonly hint: string }> = {
    header: { name: 'Header', icon: PanelTop, hint: 'Server name, description and power buttons.' },
    banner: { name: 'Banner', icon: Image, hint: 'Egg image or your banner, with status and uptime.' },
    stats: { name: 'Stat tiles', icon: LayoutGrid, hint: 'Live CPU, memory, disk, address, uptime and network.' },
    graphs: { name: 'Graphs', icon: ChartArea, hint: 'CPU, memory and network charts.' },
    info: { name: 'Server information', icon: Info, hint: 'Status, node, IDs, image and limits.' },
    actions: { name: 'Quick actions', icon: Zap, hint: 'Buttons to the server pages and your own links.' },
    sftp: { name: 'SFTP details', icon: KeyRound, hint: 'Address and username with copy buttons.' },
    notes: { name: 'Notes', icon: NotebookPen, hint: 'A private note per server. Every user only sees their own.' },
    billing: { name: 'Billing', icon: CreditCard, hint: 'Status, plan, price and due date from Paymenter or WHMCS. Only the server owner sees it.' },
    notice: { name: 'Notice', icon: Megaphone, hint: 'Your own text, such as a support message.' },
};

const widths: readonly { readonly id: BlockWidth; readonly label: string }[] = [
    { id: 'full', label: 'Full' },
    { id: 'twothirds', label: '2/3' },
    { id: 'half', label: '1/2' },
    { id: 'third', label: '1/3' },
];

const itemLabels: Readonly<Record<string, string>> = {
    cpu: 'CPU',
    memory: 'Memory',
    disk: 'Disk',
    address: 'Address',
    uptime: 'Uptime',
    network: 'Network',
    players: 'Players (Minecraft)',
    status: 'Status',
    node: 'Node',
    location: 'Location',
    id: 'Server ID',
    uuid: 'UUID',
    image: 'Docker image',
    limits: 'Limits',
    console: 'Console',
    files: 'Files',
    databases: 'Databases',
    backups: 'Backups',
    schedules: 'Schedules',
    startup: 'Startup',
    settings: 'Settings',
    custom: 'Your quick actions',
};

const optionLabel = 'text-[11px] leading-[1.5] font-semibold tracking-[0.06em] text-muted-foreground uppercase';
const help = 'text-xs leading-[1.5] text-muted-foreground';

/** The items a block can show as chips: those it shows first, in its order, then the rest. A click turns one on, at the end, or off. */
function Chips({ all, selected, onChange }: { all: readonly string[]; selected: readonly string[]; onChange: (items: string[]) => void }) {
    const shown = selected.filter((item) => all.includes(item));

    return (
        <div className='flex flex-wrap gap-1.5'>
            {[...shown, ...all.filter((item) => !shown.includes(item))].map((item) => {
                const on = shown.includes(item);
                return (
                    <button
                        key={item}
                        type='button'
                        aria-pressed={on}
                        onClick={() => onChange(on ? shown.filter((other) => other !== item) : [...shown, item])}
                        className={cn(
                            'cursor-pointer rounded-full border px-2.5 py-1 text-xs leading-[1.5] transition-colors',
                            on
                                ? 'border-primary bg-[color:color-mix(in_oklab,var(--primary)_16%,transparent)] text-foreground'
                                : 'border-border bg-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {itemLabels[item] ?? item}
                    </button>
                );
            })}
        </div>
    );
}

/** An open block's options: its width, and what it shows by its type. */
function Options({ block, set }: { block: Block; set: (patch: Partial<Block>) => void }) {
    const id = useId();
    const all = itemsOf(block.type);

    return (
        <div className='grid gap-3.5 border-t border-border p-3.5'>
            <div className='grid gap-1.5'>
                <span id={`${id}-width`} className={optionLabel}>
                    Width
                </span>
                <Segmented labelledBy={`${id}-width`} value={block.width} options={widths} onChange={(width) => set({ width })} />
            </div>
            {all && (
                <div className='grid gap-1.5'>
                    <span className={optionLabel}>Shown, in this order</span>
                    <Chips all={all} selected={block.items ?? []} onChange={(items) => set({ items })} />
                    <p className={help}>Click to turn items on or off. Items you turn on are added at the end.</p>
                </div>
            )}
            {block.type === 'banner' && (
                <div className='grid gap-1.5'>
                    <span id={`${id}-height`} className={optionLabel}>
                        Height
                    </span>
                    <Segmented
                        labelledBy={`${id}-height`}
                        value={block.height ?? 'medium'}
                        options={[
                            { id: 'small', label: 'Small' },
                            { id: 'medium', label: 'Medium' },
                            { id: 'large', label: 'Large' },
                        ]}
                        onChange={(height) => set({ height })}
                    />
                </div>
            )}
            {block.type === 'notice' && (
                <>
                    <div className='grid gap-1.5'>
                        <label htmlFor={`${id}-title`} className={optionLabel}>
                            Title
                        </label>
                        <input id={`${id}-title`} value={block.title ?? ''} maxLength={120} onChange={(event) => set({ title: event.target.value })} className={controlClass} />
                    </div>
                    <div className='grid gap-1.5'>
                        <label htmlFor={`${id}-text`} className={optionLabel}>
                            Text
                        </label>
                        <textarea
                            id={`${id}-text`}
                            rows={3}
                            value={block.text ?? ''}
                            maxLength={600}
                            onChange={(event) => set({ text: event.target.value })}
                            className={cn(controlClass, 'resize-y')}
                        />
                        <p className={help}>Supports **bold**, *italic*, ~~strikethrough~~, `code`, [links](https://example.com) and lists that start with - or 1.</p>
                    </div>
                    <div className='grid gap-1.5'>
                        <span id={`${id}-style`} className={optionLabel}>
                            Style
                        </span>
                        <Segmented
                            labelledBy={`${id}-style`}
                            value={block.tone ?? 'info'}
                            options={[
                                { id: 'info', label: 'Info' },
                                { id: 'success', label: 'Success' },
                                { id: 'warning', label: 'Warning' },
                                { id: 'danger', label: 'Danger' },
                            ]}
                            onChange={(tone) => set({ tone })}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * The Layout setting's control: the dashboard's blocks, dragged into order, opened to set their
 * width and what they show, removed, and added from the palette. The open block is the one the
 * preview marks; a click on a block in the preview opens it here.
 */
function Layout({
    value,
    onChange,
    selected,
    onSelect,
}: {
    value: SettingValue;
    onChange: (value: string) => void;
    selected: string | null;
    onSelect: (id: string | null) => void;
}) {
    const blocks = parseLayout(value);
    const list = useRef<HTMLOListElement>(null);
    const [dragging, setDragging] = useState<string | null>(null);
    const over = useRef<string | null>(null);

    // A block opened from the preview comes into view.
    useEffect(() => {
        if (selected) list.current?.querySelector(`[data-block="${CSS.escape(selected)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [selected]);

    const write = (next: readonly Block[]) => onChange(serializeLayout(next));
    const set = (id: string, patch: Partial<Block>) => write(blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)));
    const add = (type: BlockType) => {
        const block = newBlock(type);
        write([...blocks, block]);
        onSelect(block.id);
    };

    // The dragged block takes the place of the one it is over.
    const moveOnto = (target: string) => {
        if (!dragging || dragging === target || over.current === target) return;
        const from = blocks.findIndex((block) => block.id === dragging);
        const to = blocks.findIndex((block) => block.id === target);
        if (from < 0 || to < 0) return;

        const next = [...blocks];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        over.current = target;
        write(next);
    };

    return (
        <div className='grid gap-4'>
            <ol ref={list} className='m-0 grid list-none gap-2 p-0'>
                {blocks.map((block) => {
                    const kind = kinds[block.type];
                    const open = selected === block.id;
                    return (
                        <li
                            key={block.id}
                            data-block={block.id}
                            draggable
                            onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = 'move';
                                event.dataTransfer.setData('text/plain', block.id);
                                over.current = null;
                                // After the browser has taken its picture of the block.
                                window.setTimeout(() => setDragging(block.id), 0);
                            }}
                            onDragEnd={() => {
                                setDragging(null);
                                over.current = null;
                            }}
                            onDragOver={(event) => {
                                if (!dragging) return;
                                event.preventDefault();
                                event.dataTransfer.dropEffect = 'move';
                                if (block.id === dragging) over.current = null;
                                else moveOnto(block.id);
                            }}
                            onDrop={(event) => event.preventDefault()}
                            className={cn(
                                'rounded-(--basalt-control-radius) border border-border bg-popover transition-[border-color,opacity] duration-(--basalt-speed)',
                                open && 'border-[color:color-mix(in_oklab,var(--primary)_50%,var(--border))]',
                                dragging === block.id && 'border-dashed border-primary opacity-55'
                            )}
                        >
                            <div className='flex items-center gap-2 py-1.5 pr-1.5 pl-1'>
                                <span className='inline-flex cursor-grab text-muted-foreground' aria-hidden>
                                    <GripVertical className='size-4' />
                                </span>
                                <span
                                    className='inline-flex size-7 flex-none items-center justify-center rounded-[calc(var(--basalt-control-radius)*0.75)] bg-[color:color-mix(in_oklab,var(--primary)_14%,transparent)] text-primary'
                                    aria-hidden
                                >
                                    <kind.icon className='size-4' />
                                </span>
                                <button
                                    type='button'
                                    aria-expanded={open}
                                    onClick={() => onSelect(open ? null : block.id)}
                                    className='flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-0 bg-transparent p-1 text-left text-sm leading-[1.5] font-semibold text-foreground'
                                >
                                    <span className='truncate'>{block.type === 'notice' && block.title ? block.title : kind.name}</span>
                                    <small className='rounded-full bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] px-1.5 text-[11px] font-semibold text-muted-foreground'>
                                        {widths.find((width) => width.id === block.width)?.label}
                                    </small>
                                    <ChevronDown
                                        className={cn('ml-auto size-[15px] shrink-0 text-muted-foreground transition-transform duration-(--basalt-speed)', open && 'rotate-180')}
                                        aria-hidden
                                    />
                                </button>
                                <button
                                    type='button'
                                    aria-label={`Remove ${kind.name}`}
                                    title='Remove'
                                    onClick={() => write(blocks.filter((other) => other.id !== block.id))}
                                    className='inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-(--basalt-control-radius) border-0 bg-transparent text-muted-foreground transition-colors hover:bg-[color:color-mix(in_oklab,var(--destructive)_14%,transparent)] hover:text-destructive'
                                >
                                    <Trash2 className='size-3.5' aria-hidden />
                                </button>
                            </div>
                            {open && <Options block={block} set={(patch) => set(block.id, patch)} />}
                        </li>
                    );
                })}
            </ol>
            {blocks.length === 0 && (
                <p className='rounded-(--radius) border border-dashed border-border p-6 text-center text-sm leading-[1.5] text-muted-foreground'>The page is empty. Add a block below.</p>
            )}
            <div>
                <span className={optionLabel}>Add a block</span>
                <div className='mt-1.5 grid grid-cols-2 gap-1.5'>
                    {BLOCK_TYPES.map((type) => {
                        const kind = kinds[type];
                        return (
                            <button
                                key={type}
                                type='button'
                                title={kind.hint}
                                disabled={blocks.length >= MAX_BLOCKS}
                                onClick={() => add(type)}
                                className='flex min-w-0 cursor-pointer items-center gap-2 rounded-(--basalt-control-radius) border border-dashed border-border bg-transparent px-2.5 py-2 text-left text-[13px] leading-[1.5] text-foreground transition-colors hover:not-disabled:border-primary hover:not-disabled:bg-[color:color-mix(in_oklab,var(--primary)_10%,transparent)] disabled:cursor-default disabled:opacity-50'
                            >
                                <kind.icon className='size-4 flex-none text-primary' aria-hidden />
                                <span className='min-w-0 flex-1 truncate'>{kind.name}</span>
                                <Plus className='size-[13px] flex-none text-muted-foreground' aria-hidden />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/** The Layout setting: its caption and help above the blocks. */
export default function LayoutField({
    setting,
    value,
    onChange,
    selected,
    onSelect,
}: {
    setting: Setting;
    value: SettingValue;
    onChange: (value: string) => void;
    selected: string | null;
    onSelect: (id: string | null) => void;
}) {
    return (
        <div className='grid gap-1.5'>
            <span className='caption'>{setting.label}</span>
            {setting.help && <p className={help}>{setting.help}</p>}
            <Layout value={value} onChange={onChange} selected={selected} onSelect={onSelect} />
        </div>
    );
}
