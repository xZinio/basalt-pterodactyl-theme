import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, Upload, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Spinner, Switch, cn, http } from '@pterodactyl/sdk';
import Flag, { countryName, flagCodes } from '../../../components/Flag';
import type { Announcement, ContentLink, QuickAction } from '../../../lib/content';
import { Markdown } from '../../../lib/markdown';
import BillingEditor from './BillingEditor';
import { Segmented, controlClass } from './Fields';
import { IconInput } from './MenuItems';

const BASE = '/api/admin/extensions/basalt';
const contentKey = ['basalt', 'studio', 'content'] as const;

/** A content category of the studio: lists saved whole, or the egg images, saved as they are uploaded. */
export type ContentKind = 'announcements' | 'links' | 'quickActions' | 'eggImages' | 'locations' | 'players' | 'billing';

/** An announcement as administrators edit it: users get the ones enabled and in their time. */
interface EditedAnnouncement extends Announcement {
    readonly enabled: boolean;
    readonly startsAt: string | null;
    readonly endsAt: string | null;
}

interface Players {
    readonly cards: boolean;
    readonly dashboard: boolean;
    readonly eggs: readonly number[];
}

interface ContentState {
    readonly content: {
        readonly announcements: readonly EditedAnnouncement[];
        readonly links: readonly ContentLink[];
        readonly quickActions: readonly QuickAction[];
        readonly players: Players;
        readonly locations: { readonly dashboard: boolean };
    };
    readonly eggs: readonly { readonly id: number; readonly name: string; readonly image: string | null }[];
    readonly nodes: readonly { readonly id: number; readonly name: string; readonly location: number }[];
    readonly locations: readonly { readonly id: number; readonly short: string; readonly long: string | null; readonly country: string | null; readonly label: string | null }[];
}

type Flash = (tone: 'ok' | 'error', text: string) => void;

const newId = () => Math.random().toString(36).slice(2, 14);
const labelClass = 'caption';
const helpClass = 'text-xs leading-[1.5] text-muted-foreground';
const sectionClass = 'mb-4 overflow-hidden rounded-lg border border-border bg-(--card)';
const headingClass = 'border-b border-border px-4 py-3 text-xs leading-[1.5] font-semibold tracking-[0.08em] uppercase';
const iconButton =
    'inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-(--basalt-control-radius) border-0 bg-transparent text-muted-foreground transition-colors hover:bg-[color:color-mix(in_oklab,var(--foreground)_9%,transparent)] hover:text-foreground disabled:pointer-events-none disabled:opacity-35';

/** A field: its caption, its control and its help. */
function Field({ label, help, children }: { label: string; help?: ReactNode; children: (id: string) => ReactNode }) {
    const id = useId();
    return (
        <div className='grid gap-1.5'>
            <label htmlFor={id} className={labelClass}>
                {label}
            </label>
            {children(id)}
            {help && <p className={helpClass}>{help}</p>}
        </div>
    );
}

/** Choices that are on or off, such as the nodes an announcement is aimed at. */
function Choices({ items, selected, onChange }: { items: readonly { id: number; name: string }[]; selected: readonly number[]; onChange: (ids: number[]) => void }) {
    if (items.length === 0) return <span className={helpClass}>None available.</span>;

    return (
        <div className='flex flex-wrap gap-1.5'>
            {items.map((item) => {
                const on = selected.includes(item.id);
                return (
                    <button
                        key={item.id}
                        type='button'
                        aria-pressed={on}
                        onClick={() => onChange(on ? selected.filter((id) => id !== item.id) : [...selected, item.id])}
                        className={cn(
                            'cursor-pointer rounded-full border px-2.5 py-1 text-xs leading-[1.5] transition-colors',
                            on
                                ? 'border-primary bg-[color:color-mix(in_oklab,var(--primary)_16%,transparent)] text-foreground'
                                : 'border-border bg-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {item.name}
                    </button>
                );
            })}
        </div>
    );
}

/** A datetime-local value in the user's time for an ISO time, and back. */
function localTime(iso: string | null): string {
    if (!iso) return '';
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function isoTime(local: string): string | null {
    const date = new Date(local);
    return local && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

const markdownHelp = 'Supports **bold**, *italic*, ~~strikethrough~~, `code`, [links](https://example.com) and lists that start with - or 1.';
const linkHelp = 'A /path in the panel or an https link. {id}, {uuid}, {name}, {ip} and {port} are filled in on server pages.';

function AnnouncementFields({ item, set, state }: { item: EditedAnnouncement; set: (patch: Partial<EditedAnnouncement>) => void; state: ContentState }) {
    return (
        <>
            <Switch checked={item.enabled} onChange={() => set({ enabled: !item.enabled })} label='Enabled' />
            <Field label='Title'>{(id) => <input id={id} value={item.title ?? ''} maxLength={120} onChange={(event) => set({ title: event.target.value })} className={controlClass} />}</Field>
            <Field
                label='Message'
                help={
                    <>
                        {markdownHelp}
                        {item.body && /[*_`~[\]]|^\s*([-*+]|\d+[.)])\s/m.test(item.body) && (
                            <Markdown text={item.body} className='mt-2 block rounded-(--radius) border border-dashed border-border px-3 py-2.5 text-[13px] text-muted-foreground' />
                        )}
                    </>
                }
            >
                {(id) => <textarea id={id} rows={4} maxLength={2000} value={item.body ?? ''} onChange={(event) => set({ body: event.target.value })} className={cn(controlClass, 'resize-y')} />}
            </Field>
            <Field label='Type'>
                {(id) => (
                    <select id={id} value={item.type} onChange={(event) => set({ type: event.target.value as EditedAnnouncement['type'] })} className={controlClass}>
                        <option value='info'>Info</option>
                        <option value='success'>Success</option>
                        <option value='warning'>Warning</option>
                        <option value='danger'>Danger</option>
                    </select>
                )}
            </Field>
            <Field label='Style'>
                {() => (
                    <Segmented
                        label='Style'
                        value={item.style}
                        options={[
                            { id: 'banner', label: 'Banner' },
                            { id: 'card', label: 'Card' },
                            { id: 'minimal', label: 'Minimal' },
                        ]}
                        onChange={(style) => set({ style })}
                    />
                )}
            </Field>
            <Field label='Show on'>
                {() => (
                    <Segmented
                        label='Show on'
                        value={item.placement}
                        options={[
                            { id: 'everywhere', label: 'Everywhere' },
                            { id: 'dashboard', label: 'Overview' },
                            { id: 'server', label: 'Server pages' },
                        ]}
                        onChange={(placement) => set({ placement })}
                    />
                )}
            </Field>
            <Field label='Only on nodes' help='Leave empty for every node. Targeted messages only show on server pages.'>
                {() => <Choices items={state.nodes} selected={item.nodes} onChange={(nodes) => set({ nodes })} />}
            </Field>
            <Field label='Only for eggs' help='Leave empty for every egg.'>
                {() => <Choices items={state.eggs} selected={item.eggs} onChange={(eggs) => set({ eggs })} />}
            </Field>
            <Field label='Starts' help='Optional, in your local time.'>
                {(id) => <input id={id} type='datetime-local' value={localTime(item.startsAt)} onChange={(event) => set({ startsAt: isoTime(event.target.value) })} className={controlClass} />}
            </Field>
            <Field label='Ends' help='Optional. Hidden from this moment on.'>
                {(id) => <input id={id} type='datetime-local' value={localTime(item.endsAt)} onChange={(event) => set({ endsAt: isoTime(event.target.value) })} className={controlClass} />}
            </Field>
            <Field label='Button label'>
                {(id) => (
                    <input id={id} value={item.buttonLabel ?? ''} maxLength={40} placeholder='Read more' onChange={(event) => set({ buttonLabel: event.target.value })} className={controlClass} />
                )}
            </Field>
            <Field label='Button link' help={linkHelp}>
                {(id) => (
                    <input
                        id={id}
                        value={item.buttonUrl ?? ''}
                        maxLength={500}
                        placeholder='https://'
                        onChange={(event) => set({ buttonUrl: event.target.value || null })}
                        className={controlClass}
                    />
                )}
            </Field>
            <Switch checked={item.dismissible} onChange={() => set({ dismissible: !item.dismissible })} label='Users can dismiss it' />
        </>
    );
}

function LinkFields({ item, set }: { item: ContentLink; set: (patch: Partial<ContentLink>) => void }) {
    return (
        <>
            <Field label='Label'>{(id) => <input id={id} value={item.label} maxLength={40} onChange={(event) => set({ label: event.target.value })} className={controlClass} />}</Field>
            <Field label='Link' help={linkHelp}>
                {(id) => <input id={id} value={item.url} maxLength={500} placeholder='https://' onChange={(event) => set({ url: event.target.value })} className={controlClass} />}
            </Field>
            <Field label='Icon' help='Any Lucide icon name, such as book-open, store or message-circle.'>
                {(id) => <IconInput id={id} value={item.icon ?? ''} placeholder='link' onChange={(icon) => set({ icon: icon || null })} />}
            </Field>
            <Field label='Show in'>
                {(id) => (
                    <select id={id} value={item.area} onChange={(event) => set({ area: event.target.value as ContentLink['area'] })} className={controlClass}>
                        <option value='everywhere'>Every sidebar</option>
                        <option value='dashboard'>Overview</option>
                        <option value='account'>Account</option>
                        <option value='server'>Server pages</option>
                    </select>
                )}
            </Field>
            <Switch checked={item.newTab} onChange={() => set({ newTab: !item.newTab })} label='Open in a new tab' />
        </>
    );
}

/** What a quick action can open, with the label and icon it starts with. */
const actionChoices: readonly [QuickAction['action'], string, string][] = [
    ['console', 'Console', 'square-terminal'],
    ['files', 'Files', 'folder'],
    ['backups', 'Backups', 'archive'],
    ['databases', 'Databases', 'database'],
    ['schedules', 'Schedules', 'calendar-clock'],
    ['network', 'Network', 'network'],
    ['startup', 'Startup', 'rocket'],
    ['settings', 'Settings', 'settings'],
    ['url', 'Custom link', 'external-link'],
    ['upgrade', 'Upgrade plan', 'rocket'],
];

function QuickActionFields({ item, set }: { item: QuickAction; set: (patch: Partial<QuickAction>) => void }) {
    return (
        <>
            <Field label='Opens'>
                {(id) => (
                    <select
                        id={id}
                        value={item.action}
                        onChange={(event) => {
                            const next = actionChoices.find(([action]) => action === event.target.value);
                            const previous = actionChoices.find(([action]) => action === item.action);
                            if (!next) return;
                            // A label and icon that were the old choice's own follow the new one.
                            set({
                                action: next[0],
                                label: !item.label || item.label === previous?.[1] ? next[1] : item.label,
                                icon: !item.icon || item.icon === previous?.[2] ? next[2] : item.icon,
                            });
                        }}
                        className={controlClass}
                    >
                        {actionChoices.map(([action, label]) => (
                            <option key={action} value={action}>
                                {label}
                            </option>
                        ))}
                    </select>
                )}
            </Field>
            <Field label='Label'>{(id) => <input id={id} value={item.label} maxLength={30} onChange={(event) => set({ label: event.target.value })} className={controlClass} />}</Field>
            <Field label='Icon'>{(id) => <IconInput id={id} value={item.icon ?? ''} placeholder='link' onChange={(icon) => set({ icon: icon || null })} />}</Field>
            {item.action === 'upgrade' && (
                <p className={helpClass}>
                    Opens the upgrade page of the server's service in Paymenter or WHMCS. Hidden on servers without billing, so connect your billing system in the Billing tab first.
                </p>
            )}
            {item.action === 'url' && (
                <Field label='Link' help='{id}, {uuid}, {name}, {ip} and {port} are filled in per server.'>
                    {(id) => (
                        <input id={id} value={item.url ?? ''} maxLength={500} placeholder='https://' onChange={(event) => set({ url: event.target.value || null })} className={controlClass} />
                    )}
                </Field>
            )}
        </>
    );
}

/** The content, with the eggs, nodes and locations it can name. */
function useContentState() {
    return useQuery({ queryKey: contentKey, queryFn: async () => (await http.get<ContentState>(`${BASE}/content`)).data, staleTime: Infinity });
}

/** Saves a key of the content and keeps the answer, which is the whole content again. */
function useSave(onSaved: () => void, flash: Flash) {
    const client = useQueryClient();
    const [saving, setSaving] = useState(false);

    const save = async (key: string, value: unknown) => {
        setSaving(true);
        try {
            client.setQueryData(contentKey, (await http.put<ContentState>(`${BASE}/content/${key}`, { value })).data);
            flash('ok', 'Saved.');
            onSaved();
        } catch {
            flash('error', 'Could not be saved.');
        } finally {
            setSaving(false);
        }
    };

    return { save, saving };
}

/** Add, Undo changes and Save, under a list. */
function Actions({ add, dirty, saving, onUndo, onSave }: { add?: ReactNode; dirty: boolean; saving: boolean; onUndo: () => void; onSave: () => void }) {
    return (
        <div className='flex flex-wrap justify-end gap-2'>
            <span className='mr-auto'>{add}</span>
            <Button.Text size='xsmall' isSecondary disabled={!dirty || saving} onClick={onUndo}>
                Undo changes
            </Button.Text>
            <Button size='xsmall' disabled={!dirty || saving} isLoading={saving} onClick={onSave}>
                Save
            </Button>
        </div>
    );
}

/** A draft of a saved value, until it is saved or undone. */
function useDraft<T>(saved: T): [T, (next: T | ((current: T) => T)) => void, boolean] {
    const [draft, setDraft] = useState(saved);
    useEffect(() => setDraft(saved), [saved]);
    return [draft, setDraft, JSON.stringify(draft) !== JSON.stringify(saved)];
}

const lists = {
    announcements: {
        intro: 'Messages shown at the top of pages. Target them at nodes or eggs, schedule them, and let users dismiss them.',
        limit: 50,
        create: (): EditedAnnouncement => ({
            id: newId(),
            enabled: true,
            title: 'Scheduled maintenance',
            body: '',
            type: 'info',
            style: 'banner',
            placement: 'everywhere',
            nodes: [],
            eggs: [],
            startsAt: null,
            endsAt: null,
            dismissible: true,
            buttonLabel: '',
            buttonUrl: null,
        }),
    },
    links: {
        intro: 'Extra links in the sidebar, such as your store, Discord, status page or knowledge base.',
        limit: 30,
        create: (): ContentLink => ({ id: newId(), label: 'Discord', url: 'https://', icon: 'message-circle', area: 'everywhere', newTab: true }),
    },
    quickActions: {
        intro: 'Up to 4 shortcut buttons on every server card on the overview.',
        limit: 4,
        create: (): QuickAction => ({ id: newId(), label: 'Files', icon: 'folder', action: 'files', url: null }),
    },
};

type ListKind = keyof typeof lists;
type ListItem = EditedAnnouncement | ContentLink | QuickAction;

/** Announcements, links or quick actions: each a card with its fields, moved up and down, removed, added, and saved together. */
function ListEditor({ kind, state, onSaved, flash }: { kind: ListKind; state: ContentState; onSaved: () => void; flash: Flash }) {
    const saved = state.content[kind] as readonly ListItem[];
    const [items, setItems, dirty] = useDraft(saved);
    const { save, saving } = useSave(onSaved, flash);
    const { intro, limit, create } = lists[kind];

    const set = (index: number, patch: Partial<ListItem>) => setItems((current) => current.map((item, at) => (at === index ? ({ ...item, ...patch } as ListItem) : item)));
    const move = (from: number, to: number) =>
        setItems((current) => {
            const next = [...current];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });

    return (
        <>
            <p className='mb-4 text-[13px] leading-[1.5] text-muted-foreground'>{intro}</p>
            {items.length === 0 && <p className='mb-4 rounded-(--radius) border border-dashed border-border p-6 text-center text-sm leading-[1.5] text-muted-foreground'>Nothing here yet.</p>}
            {items.map((item, index) => {
                const title = ('title' in item ? item.title : item.label) || `#${index + 1}`;
                return (
                    <section key={item.id} className={sectionClass}>
                        <div className='flex items-center justify-between gap-2 border-b border-border pr-2'>
                            <h3 className={cn(headingClass, 'min-w-0 truncate border-b-0')}>{title}</h3>
                            <div className='flex gap-1'>
                                <button type='button' aria-label='Move up' title='Move up' disabled={index === 0} onClick={() => move(index, index - 1)} className={iconButton}>
                                    <ArrowUp className='size-3.5' aria-hidden />
                                </button>
                                <button type='button' aria-label='Move down' title='Move down' disabled={index === items.length - 1} onClick={() => move(index, index + 1)} className={iconButton}>
                                    <ArrowDown className='size-3.5' aria-hidden />
                                </button>
                                <button
                                    type='button'
                                    aria-label='Remove'
                                    title='Remove'
                                    onClick={() => setItems((current) => current.filter((_, at) => at !== index))}
                                    className={cn(iconButton, 'hover:bg-[color:color-mix(in_oklab,var(--destructive)_14%,transparent)] hover:text-destructive')}
                                >
                                    <Trash2 className='size-3.5' aria-hidden />
                                </button>
                            </div>
                        </div>
                        <div className='grid gap-4 p-4'>
                            {kind === 'announcements' && <AnnouncementFields item={item as EditedAnnouncement} state={state} set={(patch) => set(index, patch)} />}
                            {kind === 'links' && <LinkFields item={item as ContentLink} set={(patch) => set(index, patch)} />}
                            {kind === 'quickActions' && <QuickActionFields item={item as QuickAction} set={(patch) => set(index, patch)} />}
                        </div>
                    </section>
                );
            })}
            <Actions
                add={
                    <Button.Text size='xsmall' isSecondary disabled={items.length >= limit} onClick={() => setItems((current) => [...current, create()])}>
                        <Plus className='size-3.5' aria-hidden />
                        Add
                    </Button.Text>
                }
                dirty={dirty}
                saving={saving}
                onUndo={() => setItems(saved)}
                onSave={() => void save(kind, items)}
            />
        </>
    );
}

/** Each egg's image, uploaded or removed at once. */
function EggImages({ state, onSaved, flash }: { state: ContentState; onSaved: () => void; flash: Flash }) {
    const client = useQueryClient();
    const input = useRef<HTMLInputElement>(null);
    const target = useRef<number | null>(null);
    const [busy, setBusy] = useState<number | null>(null);

    const send = async (egg: number, file: File | null) => {
        setBusy(egg);
        try {
            const url = `${BASE}/eggs/${egg}/image`;
            const body = new FormData();
            if (file) body.append('file', file);
            client.setQueryData(contentKey, (file ? await http.post<ContentState>(url, body) : await http.delete<ContentState>(url)).data);
            flash('ok', 'Saved.');
            onSaved();
        } catch {
            flash('error', 'Could not be saved. Use a PNG, JPG, WebP or GIF up to 4 MB.');
        } finally {
            setBusy(null);
        }
    };

    return (
        <>
            <p className='mb-4 text-[13px] leading-[1.5] text-muted-foreground'>
                Artwork per egg, shown on the server cards on the overview and in the banner of the server dashboard. Wide images (around 3:1) look best.
            </p>
            <input
                ref={input}
                type='file'
                hidden
                accept='image/png,image/jpeg,image/webp,image/gif'
                aria-label='Egg image'
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file && target.current !== null) void send(target.current, file);
                }}
            />
            <section className={sectionClass}>
                <div className='grid gap-4 p-4'>
                    {state.eggs.map((egg) => (
                        <div key={egg.id} data-egg={egg.id} className='grid gap-2'>
                            <div className='flex h-18 items-center justify-center overflow-hidden rounded-(--basalt-control-radius) border border-dashed border-border text-xs text-muted-foreground'>
                                {egg.image ? <img src={egg.image} alt='' className='size-full object-cover' /> : <span>None</span>}
                            </div>
                            <span className={cn(labelClass, 'truncate')}>{egg.name}</span>
                            <div className='flex flex-wrap gap-2'>
                                <Button.Text
                                    size='xsmall'
                                    disabled={busy !== null}
                                    isLoading={busy === egg.id}
                                    onClick={() => {
                                        target.current = egg.id;
                                        input.current?.click();
                                    }}
                                >
                                    <Upload className='size-3.5' aria-hidden />
                                    Upload
                                </Button.Text>
                                {egg.image && (
                                    <Button.Text size='xsmall' isSecondary disabled={busy !== null} onClick={() => void send(egg.id, null)}>
                                        <X className='size-3.5' aria-hidden />
                                        Remove
                                    </Button.Text>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </>
    );
}

const countries = flagCodes.map((code) => [code, countryName(code)] as const).sort((a, b) => a[1].localeCompare(b[1]));

/** A country and label for each location, and whether the dashboard shows them. */
function Locations({ state, onSaved, flash }: { state: ContentState; onSaved: () => void; flash: Flash }) {
    const saved = useMemo(
        () => ({
            dashboard: state.content.locations.dashboard,
            items: Object.fromEntries(state.locations.map((location) => [location.id, { country: location.country ?? '', label: location.label ?? '' }])),
        }),
        [state]
    );
    const [value, setValue, dirty] = useDraft(saved);
    const { save, saving } = useSave(onSaved, flash);
    const setItem = (id: number, patch: Partial<{ country: string; label: string }>) =>
        setValue((current) => ({ ...current, items: { ...current.items, [id]: { ...current.items[id], ...patch } } }));

    return (
        <>
            <p className='mb-4 text-[13px] leading-[1.5] text-muted-foreground'>
                Pick a country for each location to show its flag on the servers there. Servers get their location from their node.
            </p>
            <section className={sectionClass}>
                <h3 className={headingClass}>Show the location</h3>
                <div className='grid gap-4 p-4'>
                    <Switch checked={value.dashboard} onChange={() => setValue((current) => ({ ...current, dashboard: !current.dashboard }))} label='In Server information on the dashboard' />
                </div>
            </section>
            {state.locations.length === 0 && (
                <p className='mb-4 rounded-(--radius) border border-dashed border-border p-6 text-center text-sm leading-[1.5] text-muted-foreground'>
                    There are no locations yet. Add them under Admin, Locations.
                </p>
            )}
            {state.locations.map((location) => {
                const item = value.items[location.id] ?? { country: '', label: '' };
                const nodes = state.nodes.filter((node) => node.location === location.id).map((node) => node.name);
                return (
                    <section key={location.id} className={sectionClass}>
                        <h3 className={cn(headingClass, 'flex items-center gap-2')}>
                            {item.country && <Flag code={item.country} />}
                            {location.short}
                            {location.long ? ` · ${location.long}` : ''}
                        </h3>
                        <div className='grid gap-4 p-4'>
                            <Field label='Country' help={nodes.length ? `Nodes: ${nodes.join(', ')}` : 'No nodes in this location yet.'}>
                                {(id) => (
                                    <select id={id} value={item.country} onChange={(event) => setItem(location.id, { country: event.target.value })} className={controlClass}>
                                        <option value=''>No flag</option>
                                        {countries.map(([code, name]) => (
                                            <option key={code} value={code}>
                                                {name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </Field>
                            {item.country && (
                                <Field label='Label' help='Leave empty to show the name of the country.'>
                                    {(id) => (
                                        <input
                                            id={id}
                                            value={item.label}
                                            maxLength={40}
                                            placeholder={countryName(item.country)}
                                            onChange={(event) => setItem(location.id, { label: event.target.value })}
                                            className={controlClass}
                                        />
                                    )}
                                </Field>
                            )}
                        </div>
                    </section>
                );
            })}
            <Actions
                dirty={dirty}
                saving={saving}
                onUndo={() => setValue(saved)}
                onSave={() =>
                    void save('locations', {
                        dashboard: value.dashboard,
                        items: Object.fromEntries(Object.entries(value.items).map(([id, item]) => [id, { country: item.country || null, label: item.label || null }])),
                    })
                }
            />
        </>
    );
}

/** Where the player count shows, and for which eggs' servers. */
function PlayerCount({ state, onSaved, flash }: { state: ContentState; onSaved: () => void; flash: Flash }) {
    const [value, setValue, dirty] = useDraft(state.content.players);
    const { save, saving } = useSave(onSaved, flash);

    return (
        <>
            <p className='mb-4 text-[13px] leading-[1.5] text-muted-foreground'>
                Shows how many players are online on Minecraft servers, read from the server list status every 30 seconds. Works with Java Edition servers, including
                Paper, Forge, Fabric and proxies such as BungeeCord and Velocity.
            </p>
            <section className={sectionClass}>
                <h3 className={headingClass}>Show the player count</h3>
                <div className='grid gap-4 p-4'>
                    <Switch checked={value.cards} onChange={() => setValue({ ...value, cards: !value.cards })} label='On server cards' />
                    <div className='grid gap-1.5'>
                        <Switch checked={value.dashboard} onChange={() => setValue({ ...value, dashboard: !value.dashboard })} label='On the server dashboard' />
                        <p className={helpClass}>In the banner, and as a Players tile you can add to the stat tiles in the Server dashboard tab.</p>
                    </div>
                </div>
            </section>
            <section className={sectionClass}>
                <h3 className={headingClass}>Eggs</h3>
                <div className='grid gap-4 p-4'>
                    <Field label='Count players on servers with these eggs' help='Minecraft eggs are picked for you the first time.'>
                        {() => <Choices items={state.eggs} selected={value.eggs} onChange={(eggs) => setValue({ ...value, eggs })} />}
                    </Field>
                </div>
            </section>
            <Actions dirty={dirty} saving={saving} onUndo={() => setValue(state.content.players)} onSave={() => void save('players', value)} />
        </>
    );
}

/**
 * A content category's editor. Each saves on its own, outside the settings' draft, and the
 * preview reloads to show what was saved.
 */
export default function ContentPanel({ kind, onSaved, flash }: { kind: ContentKind; onSaved: () => void; flash: Flash }) {
    return kind === 'billing' ? <BillingEditor onSaved={onSaved} flash={flash} /> : <Content kind={kind} onSaved={onSaved} flash={flash} />;
}

function Content({ kind, onSaved, flash }: { kind: Exclude<ContentKind, 'billing'>; onSaved: () => void; flash: Flash }) {
    const { data: state, isError } = useContentState();

    if (isError) return <p className='text-sm text-destructive'>The content could not be loaded.</p>;
    if (!state) return <Spinner size='large' centered />;

    if (kind === 'eggImages') return <EggImages state={state} onSaved={onSaved} flash={flash} />;
    if (kind === 'locations') return <Locations state={state} onSaved={onSaved} flash={flash} />;
    if (kind === 'players') return <PlayerCount state={state} onSaved={onSaved} flash={flash} />;
    return <ListEditor key={kind} kind={kind} state={state} onSaved={onSaved} flash={flash} />;
}
