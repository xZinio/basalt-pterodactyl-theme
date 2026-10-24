import type { LucideIcon } from 'lucide-react';
import {
    Brush,
    Gauge,
    Layers,
    LayoutDashboard,
    LayoutGrid,
    LayoutTemplate,
    LogIn,
    Monitor,
    Navigation,
    Palette,
    Settings2,
    SlidersHorizontal,
    Smartphone,
    Stamp,
    Type,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { http } from '@pterodactyl/sdk';
import manifest from '../../../../extension.json';
import type { StudioDraft } from '../../../lib/preview';

export const SETTINGS_URL = '/api/admin/themes/basalt/settings';
export const settingsKey = ['basalt', 'studio', 'settings'] as const;

export type SettingValue = string | number | boolean | null;
export type Values = Readonly<Record<string, SettingValue>>;

/** A Basalt setting as the panel's admin API lists it. */
export interface Setting {
    readonly key: string;
    readonly type: 'color' | 'image' | 'toggle' | 'select' | 'text' | 'number';
    readonly label: string;
    readonly help: string | null;
    readonly tab: string | null;
    readonly default: SettingValue;
    readonly value: SettingValue;
    readonly options: readonly { readonly value: string; readonly label: string }[];
    readonly min: number | null;
    readonly max: number | null;
    readonly step: number | null;
    /** Appended to a number's token, such as "px". */
    readonly unit: string | null;
    readonly max_length: number | null;
    readonly accept: readonly string[];
    readonly max_kilobytes: number | null;
}

export interface SettingList {
    readonly data: readonly { readonly attributes: Setting }[];
}

/** Basalt's settings with their saved values. */
export function useSettings() {
    return useQuery({
        queryKey: settingsKey,
        queryFn: async () => (await http.get<SettingList>(SETTINGS_URL)).data.data.map((item) => item.attributes),
        staleTime: Infinity,
    });
}

/** The first server the administrator can open, for the preview of a server's pages. */
export function usePreviewServer(): string | null | undefined {
    return useQuery({
        queryKey: ['basalt', 'studio', 'server'],
        queryFn: async () => {
            const first = async (params: Record<string, string | number>) =>
                (await http.get<{ data: { attributes: { identifier: string } }[] }>('/api/client', { params })).data.data[0]?.attributes.identifier;

            return (await first({ per_page: 1 })) ?? (await first({ type: 'admin-all', per_page: 1 })) ?? null;
        },
        staleTime: Infinity,
    }).data;
}

export const valuesOf = (settings: readonly Setting[]): Values => Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));

/** A page the stage previews. */
export interface PreviewPage {
    readonly id: 'overview' | 'server' | 'sign-in';
    readonly label: string;
    readonly icon: LucideIcon;
}

export const previewPages: readonly PreviewPage[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'server', label: 'Server', icon: LayoutTemplate },
    { id: 'sign-in', label: 'Sign-in page', icon: Brush },
];

/** A width the stage previews a page at; wider than the stage, the page is scaled down to fit. */
export interface Device {
    readonly id: 'desktop' | 'mobile';
    readonly label: string;
    readonly icon: LucideIcon;
    readonly width: number;
}

export const devices: readonly Device[] = [
    { id: 'desktop', label: 'Desktop', icon: Monitor, width: 1440 },
    { id: 'mobile', label: 'Mobile', icon: Smartphone, width: 390 },
];

/** A card of the settings panel: its title and the settings it holds, in order. */
export interface Section {
    readonly title: string;
    readonly keys: readonly string[];
}

export interface Category {
    readonly id: string;
    readonly label: string;
    readonly icon: LucideIcon;
    /** The manifest tabs whose settings it holds. */
    readonly tabs: readonly string[];
    /** Its cards in order; a setting none lists joins the card named after the category. */
    readonly sections?: readonly Section[];
    /** The page the stage turns to when the category opens, for settings only one page shows. */
    readonly page?: PreviewPage['id'];
}

/** The rail's categories. A setting without a tab, or with a tab none claims, is general. */
export const categories: readonly Category[] = [
    {
        id: 'colors',
        label: 'Colors',
        icon: Palette,
        tabs: ['Colors'],
        sections: [
            { title: 'Surfaces', keys: ['background', 'card', 'raised', 'border', 'input', 'sidebar'] },
            { title: 'Text', keys: ['text', 'mutedText', 'buttonText'] },
            { title: 'Accents', keys: ['accent', 'hover', 'danger', 'success', 'warning'] },
            { title: 'Console', keys: ['consoleBackground', 'consoleText'] },
        ],
    },
    { id: 'general', label: 'General', icon: Settings2, tabs: ['General', 'Account'] },
    { id: 'text', label: 'Text and shape', icon: Type, tabs: ['Text and shape'] },
    { id: 'surfaces', label: 'Surfaces', icon: Layers, tabs: ['Surfaces'] },
    { id: 'controls', label: 'Controls', icon: SlidersHorizontal, tabs: ['Controls'] },
    { id: 'layout', label: 'Layout', icon: LayoutDashboard, tabs: ['Layout'] },
    { id: 'navigation', label: 'Navigation', icon: Navigation, tabs: ['Navigation'] },
    { id: 'motion', label: 'Motion', icon: Gauge, tabs: ['Motion'] },
    {
        id: 'overview',
        label: 'Overview',
        icon: LayoutGrid,
        tabs: ['Dashboard'],
        page: 'overview',
        sections: [{ title: 'Overview', keys: ['welcome', 'serverArt', 'announcementTitle', 'announcement', 'announcementButton'] }],
    },
    { id: 'server', label: 'Server dashboard', icon: LayoutTemplate, tabs: ['Server'], page: 'server' },
    { id: 'branding', label: 'Branding', icon: Stamp, tabs: ['Branding'] },
    { id: 'sign-in', label: 'Sign-in page', icon: LogIn, tabs: ['Sign-in'], page: 'sign-in' },
];

const general = categories.find((category) => category.tabs.includes('General'));

export const categoryOf = (setting: Setting): Category | undefined =>
    categories.find((category) => category.tabs.includes(setting.tab ?? 'General')) ?? general;

/** A category's cards with their settings. */
export function sectionsOf(category: Category, settings: readonly Setting[]): { title: string; settings: Setting[] }[] {
    const own = settings.filter((setting) => categoryOf(setting) === category);
    const sections = (category.sections ?? []).map((section) => ({
        title: section.title,
        settings: section.keys.flatMap((key) => own.filter((setting) => setting.key === key)),
    }));
    const rest = own.filter((setting) => !sections.some((section) => section.settings.includes(setting)));
    const named = sections.find((section) => section.title === category.label);

    if (named) named.settings.push(...rest);
    else sections.push({ title: category.label, settings: rest });

    return sections.filter((section) => section.settings.length > 0);
}

/** The colour settings a preset sets, in the order its palette lists them. */
const paletteKeys = [
    'background',
    'card',
    'raised',
    'border',
    'input',
    'sidebar',
    'text',
    'mutedText',
    'buttonText',
    'accent',
    'hover',
    'danger',
    'success',
    'warning',
    'consoleBackground',
    'consoleText',
] as const;

export interface Preset {
    readonly name: string;
    readonly values: Readonly<Record<(typeof paletteKeys)[number], string>>;
}

const palette = (name: string, colors: readonly string[]): Preset => ({
    name,
    values: Object.fromEntries(paletteKeys.map((key, index) => [key, `#${colors[index]}`])) as Preset['values'],
});

/** Every colour of the Colors category at once: surfaces, text, accents, states and the console. */
export const presets: readonly Preset[] = [
    palette('Basalt', ['1e1e20', '252529', '2d2d30', '3f3f46', '2d2d30', '1a1a1c', 'fafafa', 'a1a1aa', 'ffffff', '228cf4', '4da3f7', 'e5484d', '3fb37f', 'f5c451', '161618', 'd4d4d8']),
    palette('Midnight', ['0f172a', '16203a', '1e2a47', '2b3a5c', '1e2a47', '0b1222', 'f1f5f9', '94a3b8', 'ffffff', '6366f1', '818cf8', 'ef4444', '22c55e', 'eab308', '0b1222', 'e2e8f0']),
    palette('Forest', ['161c19', '1d2521', '252f2a', '34423b', '252f2a', '121714', 'f0f5f2', '9aaba2', 'ffffff', '2fa66b', '4cc38a', 'e5484d', '4cc38a', 'f5c451', '101411', 'd6e2dc']),
    palette('Pterodactyl', ['33404c', '3f4d5a', '515f6c', '515f6c', '515f6c', '3f4d5a', 'cad1d9', '7b8793', 'f5f7fa', '236bdd', '04b6d4', 'fb2c36', '00c758', 'fac800', '1f2933', 'cccccc']),
    palette('Ember', ['1c1917', '24201d', '2c2724', '44403c', '2c2724', '171412', 'fafaf9', 'a8a29e', 'ffffff', 'ea580c', 'fb923c', 'ef4444', '22c55e', 'facc15', '141210', 'e7e5e4']),
    palette('Ocean', ['0c1a1f', '11242b', '172e36', '23434d', '172e36', '09151a', 'ecfeff', '94b8bf', 'ffffff', '0891b2', '22d3ee', 'f43f5e', '10b981', 'f59e0b', '08141a', 'cfe8ec']),
    palette('Rose', ['1d161b', '261d24', '2f242c', '4a3844', '2f242c', '181216', 'fdf2f8', 'b8a1b0', 'ffffff', 'db2777', 'f472b6', 'ef4444', '34d399', 'fbbf24', '150f13', 'f0dde8']),
    palette('Arctic', ['1f2430', '262c3a', '2e3546', '3d4659', '2e3546', '1b1f2a', 'eceff4', 'a3adc2', 'ffffff', '5e81ac', '88c0d0', 'bf616a', 'a3be8c', 'ebcb8b', '1a1e27', 'd8dee9']),
];

/** Whether the draft already uses a preset's colours. */
export const usesPreset = (values: Values, preset: Preset): boolean =>
    Object.entries(preset.values).every(([key, color]) => String(values[key] ?? '').toLowerCase() === color);

const declared = manifest.theme.settings as Readonly<Record<string, { readonly type: string; readonly token?: string; readonly attribute?: string }>>;

/** A CSS string, escaped as the panel escapes a text or image token. */
const cssString = (value: string) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\a ')}"`;

function tokenValue(setting: Setting, value: Exclude<SettingValue, null>): string {
    if (setting.type === 'number') return `${value}${setting.unit ?? ''}`;
    if (setting.type === 'color' || setting.type === 'select') return String(value);
    if (setting.type === 'toggle') return value ? '1' : '0';
    if (setting.type === 'image') return `url(${cssString(String(value))})`;
    return cssString(String(value));
}

/** What a set of values writes: the tokens and `<html>` attributes the manifest maps them to. */
export function draftOf(settings: readonly Setting[], values: Values): StudioDraft {
    const tokens: Record<string, string> = {};
    const attributes: Record<string, string> = {};

    for (const setting of settings) {
        const value = values[setting.key];
        if (value === null || value === undefined) continue;
        const { token, attribute } = declared[setting.key] ?? {};
        if (token) tokens[token] = tokenValue(setting, value);
        if (attribute) attributes[attribute] = String(value);
    }

    return { settings: values, tokens, attributes };
}

/** Settings with a token or an attribute that the page's code reads as well. */
const readByCode = new Set(['motion', 'pageTransition', 'font', 'navigation']);

/**
 * Settings the page's code reads, not only the stylesheet, and images, which the sign-in preview
 * draws from its settings: the preview reloads when one changes.
 */
export const reloadsPreview = (key: string): boolean =>
    readByCode.has(key) || declared[key]?.type === 'image' || (!declared[key]?.token && !declared[key]?.attribute);

export const isHex = (value: string): boolean => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);

/** A hex colour in the six-digit, lowercase form the panel stores. */
export const fullHex = (value: string): string =>
    (value.length === 4 ? `#${[...value.slice(1)].map((digit) => digit + digit).join('')}` : value).toLowerCase();

/** The draft as a file: every setting but the images, which are this panel's own uploads. */
export const exportedSettings = (settings: readonly Setting[], values: Values) => ({
    theme: manifest.id,
    version: manifest.version,
    settings: Object.fromEntries(settings.filter((setting) => setting.type !== 'image').map((setting) => [setting.key, values[setting.key]])),
});

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** A value from a file as a setting stores it, or undefined when the setting could not take it. */
function importedValue(setting: Setting, value: unknown): SettingValue | undefined {
    switch (setting.type) {
        case 'color':
            return typeof value === 'string' && isHex(value) ? fullHex(value) : undefined;
        case 'toggle':
            return typeof value === 'boolean' ? value : undefined;
        case 'select':
            return setting.options.some((option) => option.value === value) ? (value as string) : undefined;
        case 'text':
            return typeof value === 'string' ? value.slice(0, setting.max_length ?? undefined) : undefined;
        case 'number':
            return typeof value === 'number' && value >= (setting.min ?? -Infinity) && value <= (setting.max ?? Infinity) ? value : undefined;
        default:
            return undefined;
    }
}

/** The values in an exported file (or a bare object of them) that Basalt's settings take; images and the rest are skipped. */
export function importedValues(settings: readonly Setting[], data: unknown): Record<string, SettingValue> {
    const source = isRecord(data) && isRecord(data.settings) ? data.settings : data;
    if (!isRecord(source)) return {};

    return Object.fromEntries(
        settings.flatMap((setting) => {
            const value = importedValue(setting, source[setting.key]);
            return value === undefined ? [] : [[setting.key, value]];
        })
    );
}
