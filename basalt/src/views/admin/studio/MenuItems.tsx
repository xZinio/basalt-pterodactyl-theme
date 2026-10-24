import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Eye, EyeOff, GripVertical, RotateCcw } from 'lucide-react';
import { NamedIcon, cn } from '@pterodactyl/sdk';
import { MENU_GROUPS, MENU_MESSAGE, parseMenu, serializeMenu, type KnownItem, type MenuArea, type MenuEntry, type MenuGroup } from '../../../lib/menu';
import { Segmented, controlClass } from './Fields';
import type { Setting, SettingValue } from './model';

/** The menus' items as the studio's preview last reported them; a menu stays unknown until a page of it is previewed. */
export type KnownMenus = Partial<Record<MenuArea, readonly KnownItem[]>>;

/** Listens for the preview frames' reports of their menus' items. */
export function useKnownMenus(): KnownMenus {
    const [known, setKnown] = useState<KnownMenus>({});

    useEffect(() => {
        const receive = (event: MessageEvent) => {
            const data = event.data as { type?: unknown; area?: unknown; items?: unknown } | null;
            if (event.origin !== window.location.origin || data?.type !== MENU_MESSAGE || !Array.isArray(data.items)) return;
            if (data.area !== 'server' && data.area !== 'account') return;
            const area = data.area;
            setKnown((current) => ({ ...current, [area]: data.items as KnownItem[] }));
        };
        window.addEventListener('message', receive);
        return () => window.removeEventListener('message', receive);
    }, []);

    return known;
}

/** One item in the editor: as the panel names it, as the administrator changed it, and where it now is. */
interface Row extends KnownItem {
    readonly entry?: MenuEntry;
    readonly shownLabel: string;
    readonly shownIcon: string;
    /** Its group now; `group` is the one it takes until it is moved. */
    readonly placed: MenuGroup;
    readonly hidden: boolean;
}

function rowsOf(known: readonly KnownItem[], entries: readonly MenuEntry[], grouped: boolean): Row[] {
    const placed = new Map(entries.map((entry, index) => [entry.key, { entry, index }]));

    return known
        .map((item, index) => {
            const found = placed.get(item.key);
            const entry = found?.entry;
            return {
                row: {
                    ...item,
                    entry,
                    shownLabel: entry?.label ?? item.label,
                    shownIcon: entry?.icon ?? item.icon,
                    placed: grouped ? (entry?.group ?? item.group) : 'General',
                    hidden: entry?.hidden === true,
                },
                rank: found ? found.index : 10_000 + index,
            };
        })
        .sort((a, b) => a.rank - b.rank)
        .map(({ row }) => row);
}

/** An icon by its Lucide name, beside a preview of it. */
function IconInput({ id, value, placeholder, onChange }: { id: string; value: string; placeholder: string; onChange: (value: string) => void }) {
    return (
        <div className='grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2'>
            <span className='inline-flex items-center justify-center rounded-(--basalt-control-radius) border border-input-border bg-input' aria-hidden>
                <NamedIcon name={value || placeholder} size={16} />
            </span>
            <input
                id={id}
                value={value}
                maxLength={40}
                placeholder={placeholder}
                spellCheck={false}
                onChange={(event) => onChange(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className={controlClass}
            />
        </div>
    );
}

const optionLabel = 'text-[11px] leading-[1.5] font-semibold tracking-[0.06em] text-muted-foreground uppercase';
const linkButton =
    'inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[13px] leading-[1.5] text-muted-foreground hover:not-disabled:text-foreground disabled:cursor-default disabled:opacity-50';

/** An open item's options: its label, its icon, its group in the server menu, and a way back to its own. */
function Options({
    row,
    grouped,
    first,
    last,
    set,
    reset,
    move,
}: {
    row: Row;
    grouped: boolean;
    first: boolean;
    last: boolean;
    set: (patch: Partial<MenuEntry>) => void;
    reset: () => void;
    move: (by: -1 | 1) => void;
}) {
    const id = useId();
    const changed = Boolean(row.entry?.label || row.entry?.icon || row.entry?.hidden || (row.entry?.group && row.entry.group !== row.group));

    return (
        <div className='grid gap-3.5 border-t border-border p-3.5'>
            <div className='grid gap-1.5'>
                <label htmlFor={`${id}-label`} className={optionLabel}>
                    Label
                </label>
                <input
                    id={`${id}-label`}
                    value={row.entry?.label ?? ''}
                    maxLength={60}
                    placeholder={row.label}
                    onChange={(event) => set({ label: event.target.value || undefined })}
                    className={controlClass}
                />
            </div>
            <div className='grid gap-1.5'>
                <label htmlFor={`${id}-icon`} className={optionLabel}>
                    Icon
                </label>
                <IconInput id={`${id}-icon`} value={row.entry?.icon ?? ''} placeholder={row.icon} onChange={(icon) => set({ icon: icon || undefined })} />
                <p className='text-xs leading-[1.5] text-muted-foreground'>Any Lucide icon name, such as terminal, folder-open or gamepad-2. Leave empty for the default.</p>
            </div>
            {grouped && (
                <div className='grid gap-1.5'>
                    <label htmlFor={`${id}-group`} className={optionLabel}>
                        Group
                    </label>
                    <select id={`${id}-group`} value={row.placed} onChange={(event) => set({ group: event.target.value as MenuGroup })} className={controlClass}>
                        {MENU_GROUPS.map((group) => (
                            <option key={group} value={group}>
                                {group}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            <div className='flex flex-wrap gap-x-4 gap-y-2'>
                <button type='button' className={linkButton} onClick={reset} disabled={!changed}>
                    <RotateCcw className='size-[13px]' aria-hidden />
                    Reset this item
                </button>
                {/* Dragging's keyboard counterpart. */}
                <button type='button' className={linkButton} onClick={() => move(-1)} disabled={first}>
                    Move up
                </button>
                <button type='button' className={linkButton} onClick={() => move(1)} disabled={last}>
                    Move down
                </button>
            </div>
        </div>
    );
}

/**
 * The Menu items setting's control: the server's and the account's menus as the preview reported
 * them, whose items are dragged into order and between the server menu's groups, renamed, given
 * another icon, or hidden. Changing anything stores the whole menu's order.
 */
function MenuItems({ value, onChange, known }: { value: SettingValue; onChange: (value: string) => void; known: KnownMenus }) {
    const [area, setArea] = useState<MenuArea>('server');
    const [open, setOpen] = useState<string | null>(null);
    const [dragging, setDragging] = useState<string | null>(null);
    const over = useRef<string | null>(null);

    const config = parseMenu(value);
    const grouped = area === 'server';
    const entries = config[area];
    const rows = rowsOf(known[area] ?? [], entries, grouped);

    // Every row's entry, in the rows' order, then the entries of items the preview did not report.
    const write = (next: readonly Row[]) => {
        const keys = new Set(next.map((row) => row.key));
        const written: MenuEntry[] = next.map((row) => ({
            key: row.key,
            label: row.entry?.label,
            icon: row.entry?.icon,
            hidden: row.hidden || undefined,
            group: grouped && row.placed !== row.group ? row.placed : undefined,
        }));
        onChange(serializeMenu({ ...config, [area]: [...written, ...entries.filter((entry) => !keys.has(entry.key))] }));
    };

    const set = (key: string, patch: Partial<MenuEntry>) =>
        write(
            rows.map((row) => {
                if (row.key !== key) return row;
                const entry: MenuEntry = { ...(row.entry ?? { key }), ...patch };
                return { ...row, entry, hidden: entry.hidden === true, placed: grouped ? (entry.group ?? row.group) : row.placed };
            })
        );

    const reset = (key: string) => write(rows.map((row) => (row.key === key ? { ...row, entry: undefined, hidden: false, placed: row.group } : row)));

    // Puts the dragged item before the one it is over, or after the one it is over when it came from above; or last in an empty group.
    const drop = (target: string | null, group: MenuGroup) => {
        if (!dragging || dragging === target) return;
        const from = rows.findIndex((row) => row.key === dragging);
        if (from < 0) return;

        const next = [...rows];
        const [moved] = next.splice(from, 1);
        const row = { ...moved, placed: group };
        if (target === null) {
            const last = next.map((item) => item.placed).lastIndexOf(group);
            next.splice(last < 0 ? next.length : last + 1, 0, row);
        } else {
            const at = next.findIndex((item) => item.key === target);
            next.splice(at < 0 ? next.length : at + Number(at >= from), 0, row);
        }
        write(next);
    };

    // A keyboard move: one place up or down within the item's group.
    const move = (key: string, by: -1 | 1) => {
        const row = rows.find((item) => item.key === key);
        if (!row) return;
        const siblings = rows.filter((item) => item.placed === row.placed);
        const neighbour = siblings[siblings.indexOf(row) + by];
        if (!neighbour) return;

        const next = rows.filter((item) => item.key !== key);
        const at = next.indexOf(neighbour);
        next.splice(by < 0 ? at : at + 1, 0, row);
        write(next);
    };

    const sections = grouped ? MENU_GROUPS.map((title) => ({ title, rows: rows.filter((row) => row.placed === title) })) : [{ title: 'General' as const, rows }];

    return (
        <div className='grid gap-4'>
            <div className='mb-4 grid'>
                <Segmented
                    label='Menu'
                    value={area}
                    options={[
                        { id: 'server', label: 'Server pages' },
                        { id: 'account', label: 'Account pages' },
                    ]}
                    onChange={(next) => {
                        setArea(next);
                        setOpen(null);
                    }}
                />
            </div>
            {rows.length === 0 && (
                <p className='mb-4 rounded-(--radius) border border-dashed border-border p-6 text-center text-sm leading-[1.5] text-muted-foreground'>
                    {area === 'server' ? 'Open a server in the preview to load its menu.' : 'Open an account page in the preview to load its menu.'}
                </p>
            )}
            {rows.length > 0 && (
                <div>
                    {sections.map((section) => (
                        <div
                            key={section.title}
                            className='not-first:mt-4'
                            onDragOver={(event) => {
                                if (!dragging || section.rows.length > 0) return;
                                event.preventDefault();
                                if (over.current !== `group:${section.title}`) {
                                    over.current = `group:${section.title}`;
                                    drop(null, section.title);
                                }
                            }}
                            onDrop={(event) => event.preventDefault()}
                        >
                            {grouped && <span className={cn(optionLabel, 'mb-1.5 block')}>{section.title}</span>}
                            <ol className='m-0 grid list-none gap-2 p-0'>
                                {section.rows.map((row) => {
                                    const expanded = open === row.key;
                                    const index = section.rows.indexOf(row);
                                    return (
                                        <li
                                            key={row.key}
                                            draggable
                                            data-dragging={dragging === row.key || undefined}
                                            onDragStart={(event) => {
                                                event.dataTransfer.effectAllowed = 'move';
                                                event.dataTransfer.setData('text/plain', row.key);
                                                over.current = null;
                                                // After the browser has taken its picture of the item.
                                                window.setTimeout(() => setDragging(row.key), 0);
                                            }}
                                            onDragEnd={() => {
                                                setDragging(null);
                                                over.current = null;
                                            }}
                                            onDragOver={(event) => {
                                                if (!dragging) return;
                                                event.preventDefault();
                                                event.stopPropagation();
                                                event.dataTransfer.dropEffect = 'move';
                                                if (row.key === dragging) {
                                                    over.current = null;
                                                } else if (over.current !== row.key) {
                                                    over.current = row.key;
                                                    drop(row.key, row.placed);
                                                }
                                            }}
                                            onDrop={(event) => event.preventDefault()}
                                            className={cn(
                                                'rounded-(--basalt-control-radius) border border-border bg-popover transition-[border-color,opacity] duration-(--basalt-speed)',
                                                expanded && 'border-[color:color-mix(in_oklab,var(--primary)_50%,var(--border))]',
                                                dragging === row.key && 'border-dashed border-primary opacity-55'
                                            )}
                                        >
                                            <div className='flex items-center gap-2 py-1.5 pr-1.5 pl-1'>
                                                <span className='inline-flex cursor-grab text-muted-foreground' aria-hidden>
                                                    <GripVertical className='size-4' />
                                                </span>
                                                <span
                                                    className={cn(
                                                        'inline-flex size-7 flex-none items-center justify-center rounded-[calc(var(--basalt-control-radius)*0.75)] bg-[color:color-mix(in_oklab,var(--primary)_14%,transparent)] text-primary',
                                                        row.hidden && 'opacity-45'
                                                    )}
                                                    aria-hidden
                                                >
                                                    <NamedIcon name={row.shownIcon} size={16} />
                                                </span>
                                                <button
                                                    type='button'
                                                    aria-expanded={expanded}
                                                    onClick={() => setOpen(expanded ? null : row.key)}
                                                    className={cn(
                                                        'flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-0 bg-transparent p-1 text-left text-sm leading-[1.5] font-semibold text-foreground',
                                                        row.hidden && 'opacity-45'
                                                    )}
                                                >
                                                    <span className={cn('truncate', row.hidden && 'line-through')}>{row.shownLabel}</span>
                                                    {row.shownLabel !== row.label && (
                                                        <small className='rounded-full bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] px-1.5 text-[11px] font-semibold text-muted-foreground'>
                                                            {row.label}
                                                        </small>
                                                    )}
                                                    <ChevronDown
                                                        className={cn('ml-auto size-[15px] shrink-0 text-muted-foreground transition-transform duration-(--basalt-speed)', expanded && 'rotate-180')}
                                                        aria-hidden
                                                    />
                                                </button>
                                                <button
                                                    type='button'
                                                    aria-pressed={row.hidden}
                                                    aria-label={row.hidden ? `Show ${row.shownLabel}` : `Hide ${row.shownLabel}`}
                                                    title={row.hidden ? 'Show' : 'Hide'}
                                                    onClick={() => set(row.key, { hidden: row.hidden ? undefined : true })}
                                                    className='inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-(--basalt-control-radius) border-0 bg-transparent text-muted-foreground transition-colors hover:bg-[color:color-mix(in_oklab,var(--foreground)_9%,transparent)] hover:text-foreground'
                                                >
                                                    {row.hidden ? <EyeOff className='size-3.5' aria-hidden /> : <Eye className='size-3.5' aria-hidden />}
                                                </button>
                                            </div>
                                            {expanded && (
                                                <Options
                                                    row={row}
                                                    grouped={grouped}
                                                    first={index === 0}
                                                    last={index === section.rows.length - 1}
                                                    set={(patch) => set(row.key, patch)}
                                                    reset={() => reset(row.key)}
                                                    move={(by) => move(row.key, by)}
                                                />
                                            )}
                                        </li>
                                    );
                                })}
                            </ol>
                            {grouped && section.rows.length === 0 && (
                                <p
                                    className={cn(
                                        'm-0 rounded-(--radius) border border-dashed border-border p-3 text-center text-[13px] leading-[1.5] text-muted-foreground',
                                        dragging && 'border-primary text-foreground'
                                    )}
                                >
                                    Drag an item here
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/** The Menu items setting: its caption and help above the menus. */
export default function MenuItemsField({
    setting,
    value,
    onChange,
    known,
}: {
    setting: Setting;
    value: SettingValue;
    onChange: (value: string) => void;
    known: KnownMenus;
}) {
    return (
        <div className='grid gap-1.5'>
            <span className='caption'>{setting.label}</span>
            {setting.help && <p className='text-xs leading-[1.5] text-muted-foreground'>{setting.help}</p>}
            <MenuItems value={value} onChange={onChange} known={known} />
        </div>
    );
}
