import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, PanelLink, Portal, Spinner, Tooltip, cn, http, httpErrorToHuman } from '@pterodactyl/sdk';
import { adoptSaved } from '../../../lib/preview';
import { Field } from './Fields';
import MenuItemsField, { useKnownMenus } from './MenuItems';
import Presets from './Presets';
import Stage from './Stage';
import {
    SETTINGS_URL,
    categories,
    categoryOf,
    draftOf,
    exportedSettings,
    importedValues,
    sectionsOf,
    settingsKey,
    useSettings,
    valuesOf,
    type Category,
    type Device,
    type PreviewPage,
    type Setting,
    type SettingList,
    type SettingValue,
    type Values,
} from './model';

/** The studio covers the admin area: a full-screen editor with its own way back. */
function Screen({ children }: { children: ReactNode }) {
    // The page under the editor keeps still; on narrow screens the editor scrolls itself.
    useEffect(() => {
        const root = document.documentElement;
        const overflow = root.style.overflow;
        root.style.overflow = 'hidden';
        return () => {
            root.style.overflow = overflow;
        };
    }, []);

    return (
        <Portal>
            <div className='fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-background text-foreground'>{children}</div>
        </Portal>
    );
}

/** Basalt's settings, edited against a live preview of the panel and saved together. */
export default function Editor() {
    const { data: settings, error } = useSettings();

    if (!settings) {
        return (
            <Screen>
                <div className='flex h-dvh items-center justify-center p-6 text-sm text-muted-foreground'>
                    {error ? httpErrorToHuman(error) : <Spinner size='large' />}
                </div>
            </Screen>
        );
    }

    return <Studio settings={settings} />;
}

type Message = { readonly tone: 'ok' | 'error'; readonly text: string };

function Studio({ settings }: { settings: readonly Setting[] }) {
    const queryClient = useQueryClient();
    const saved = useMemo(() => valuesOf(settings), [settings]);
    const [draft, setDraft] = useState<Values | null>(null);
    const [category, setCategory] = useState<Category>(categories[0]);
    const [page, setPage] = useState<PreviewPage['id']>('overview');
    const [device, setDevice] = useState<Device['id']>('desktop');
    const [message, setMessage] = useState<Message | null>(null);
    const [saving, setSaving] = useState(false);
    const knownMenus = useKnownMenus();
    const importer = useRef<HTMLInputElement>(null);

    const values = useMemo<Values>(() => {
        if (!draft) return saved;

        // Images are stored as soon as they change, so the draft always shows their saved value.
        const images = settings.filter((setting) => setting.type === 'image').map((setting) => [setting.key, saved[setting.key]]);
        return { ...draft, ...Object.fromEntries(images) };
    }, [draft, saved, settings]);
    const changed = settings.filter((setting) => setting.type !== 'image' && values[setting.key] !== saved[setting.key]);
    const dirty = changed.length > 0;

    useEffect(() => {
        if (!dirty) return;

        const warn = (event: BeforeUnloadEvent) => event.preventDefault();
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    const edit = (next: Readonly<Record<string, SettingValue>>) => {
        setMessage(null);
        setDraft((current) => ({ ...(current ?? saved), ...next }));
    };

    const stored = (fresh: Setting[]) => queryClient.setQueryData(settingsKey, fresh);

    const save = async () => {
        setSaving(true);
        try {
            const { data } = await http.patch<SettingList>(SETTINGS_URL, {
                settings: Object.fromEntries(changed.map((setting) => [setting.key, values[setting.key]])),
            });
            const fresh = data.data.map((item) => item.attributes);
            stored(fresh);
            adoptSaved(draftOf(fresh, valuesOf(fresh)));
            setDraft(null);
            setMessage({ tone: 'ok', text: 'Saved.' });
        } catch (error) {
            setMessage({ tone: 'error', text: httpErrorToHuman(error) });
        } finally {
            setSaving(false);
        }
    };

    const download = () => {
        const file = new Blob([JSON.stringify(exportedSettings(settings, values), null, 4)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = 'basalt-settings.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href));
    };

    const upload = async (file: File) => {
        let imported: Record<string, SettingValue> = {};
        try {
            imported = importedValues(settings, JSON.parse(await file.text()));
        } catch {
            // Not JSON: nothing to import.
        }

        const count = Object.keys(imported).length;
        if (count === 0) {
            setMessage({ tone: 'error', text: 'That file holds no Basalt settings.' });
            return;
        }
        edit(imported);
        setMessage({ tone: 'ok', text: `Imported ${count} ${count === 1 ? 'setting' : 'settings'}. Save to keep them.` });
    };

    const open = (next: Category) => {
        setCategory(next);
        if (next.page) setPage(next.page);
    };

    // Images keep their uploads: their own Remove button clears them.
    const reset = () =>
        edit(
            Object.fromEntries(
                settings.filter((setting) => categoryOf(setting) === category && setting.type !== 'image').map((setting) => [setting.key, setting.default])
            )
        );

    return (
        <Screen>
            <div className='grid h-dvh min-h-[36rem] grid-cols-[3.5rem_minmax(18rem,24rem)_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden max-[1100px]:h-auto max-[1100px]:grid-cols-[3.5rem_minmax(0,1fr)]'>
                <header className='col-span-full flex flex-wrap items-center gap-4 border-b border-border px-4 py-3'>
                    <PanelLink
                        destination={{ to: '/panel' }}
                        onClick={(event) => {
                            if (dirty && !window.confirm('Leave without saving your changes?')) event.preventDefault();
                        }}
                        className='inline-flex items-center gap-1.5 rounded-(--basalt-control-radius) border border-border px-3 py-1.5 text-[13px] leading-[1.5] font-medium text-muted-foreground no-underline transition-colors hover:bg-popover hover:text-foreground'
                    >
                        <ArrowLeft className='size-4' aria-hidden />
                        Back to admin
                    </PanelLink>
                    <h1 className='font-header text-xl leading-[1.5] font-semibold'>Basalt</h1>
                    <span role='status' className={cn('text-[13px] leading-[1.5]', message?.tone === 'error' ? 'text-destructive' : 'text-success')}>
                        {message?.text}
                    </span>
                    <div className='ml-auto flex flex-wrap gap-2'>
                        <Button.Text size='xsmall' isSecondary onClick={download}>
                            Export
                        </Button.Text>
                        <Button.Text size='xsmall' isSecondary onClick={() => importer.current?.click()}>
                            Import
                        </Button.Text>
                        <Button.Text
                            size='xsmall'
                            isSecondary
                            disabled={!dirty}
                            onClick={() => {
                                setDraft(null);
                                setMessage(null);
                            }}
                        >
                            Undo changes
                        </Button.Text>
                        <Button size='xsmall' disabled={!dirty} isLoading={saving} onClick={save}>
                            Save
                        </Button>
                        <input
                            ref={importer}
                            type='file'
                            accept='application/json,.json'
                            aria-label='Settings file'
                            className='hidden'
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = '';
                                if (file) void upload(file);
                            }}
                        />
                    </div>
                </header>

                <nav aria-label='Settings' className='flex flex-col items-center gap-1 overflow-y-auto overscroll-contain border-r border-border py-3'>
                    {categories.filter((item) => settings.some((setting) => categoryOf(setting) === item)).map((item) => (
                        <Tooltip key={item.id} content={item.label} placement='right'>
                            <button
                                type='button'
                                aria-label={item.label}
                                aria-current={item === category ? 'true' : undefined}
                                onClick={() => open(item)}
                                className={cn(
                                    'inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-(--basalt-control-radius) border-0 transition-colors',
                                    item === category ? 'bg-primary/18 text-foreground' : 'bg-transparent text-muted-foreground hover:bg-popover hover:text-foreground'
                                )}
                            >
                                <item.icon className='size-[18px]' aria-hidden />
                            </button>
                        </Tooltip>
                    ))}
                </nav>

                <div className='overflow-y-auto overscroll-contain border-r border-border p-4 max-[1100px]:overflow-visible max-[1100px]:border-r-0'>
                    <div className='mb-4 flex items-center justify-between gap-3 border-b border-border pb-3'>
                        <h2 className='font-header text-lg leading-[1.5] font-semibold'>{category.label}</h2>
                        <Button.Text size='xsmall' isSecondary onClick={reset}>
                            <RotateCcw className='size-3.5' aria-hidden />
                            Reset to default
                        </Button.Text>
                    </div>
                    {category.id === 'colors' && (
                        <Section title='Presets'>
                            <Presets values={values} onPick={(preset) => edit(preset.values)} />
                        </Section>
                    )}
                    {sectionsOf(category, settings).map((section) => (
                        <Section key={section.title} title={section.title}>
                            <div className='grid gap-4 p-4'>
                                {section.settings.map((setting) =>
                                    setting.key === 'menuItems' ? (
                                        <MenuItemsField
                                            key={setting.key}
                                            setting={setting}
                                            value={values[setting.key] ?? null}
                                            onChange={(value) => edit({ [setting.key]: value })}
                                            known={knownMenus}
                                        />
                                    ) : (
                                        <Field
                                            key={setting.key}
                                            setting={setting}
                                            value={values[setting.key] ?? null}
                                            onChange={(value) => edit({ [setting.key]: value })}
                                            onSaved={stored}
                                        />
                                    )
                                )}
                            </div>
                        </Section>
                    ))}
                </div>

                <Stage settings={settings} values={values} page={page} screen={category.screen} device={device} onPage={setPage} onDevice={setDevice} />
            </div>
        </Screen>
    );
}

/** A card of the settings panel under its small heading. */
function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className='mb-4 overflow-hidden rounded-lg border border-border bg-(--card)'>
            <h3 className='border-b border-border px-4 py-3 text-xs leading-[1.5] font-semibold tracking-[0.08em] uppercase'>{title}</h3>
            {children}
        </section>
    );
}
