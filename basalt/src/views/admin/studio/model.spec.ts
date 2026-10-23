import { describe, expect, test } from 'vitest';
import manifest from '../../../../extension.json';
import { categories, draftOf, exportedSettings, importedValues, reloadsPreview, sectionsOf, valuesOf, type Setting } from './model';

type Declared = {
    type: Setting['type'];
    label: string;
    default?: Setting['default'];
    tab?: string;
    options?: Record<string, string>;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    maxLength?: number;
};

// The settings as the panel's admin API lists them: each declared setting at its default.
const settings: Setting[] = Object.entries(manifest.theme.settings as Record<string, Declared>).map(([key, setting]) => ({
    key,
    type: setting.type,
    label: setting.label,
    help: null,
    tab: setting.tab ?? null,
    default: setting.default ?? null,
    value: setting.default ?? null,
    options: Object.entries(setting.options ?? {}).map(([value, label]) => ({ value, label })),
    min: setting.min ?? null,
    max: setting.max ?? null,
    step: setting.step ?? null,
    unit: setting.unit ?? null,
    max_length: setting.maxLength ?? null,
    accept: [],
    max_kilobytes: null,
}));

describe('the studio', () => {
    test('writes a draft as the tokens and attributes the panel writes for saved settings', () => {
        const draft = draftOf(settings, { ...valuesOf(settings), accent: '#ea580c', glass: false, loginTagline: 'Say "hi"', loginImage: null });

        expect(draft.tokens['--basalt-primary']).toBe('#ea580c');
        expect(draft.attributes['data-basalt-glass']).toBe('false');
        expect(draft.tokens['--basalt-login-image']).toBeUndefined();
        expect(draft.settings.loginTagline).toBe('Say "hi"');
    });

    test('imports what it exports, and only values the settings can take', () => {
        const values = { ...valuesOf(settings), accent: '#ea580c', density: 'compact' };
        expect(importedValues(settings, JSON.parse(JSON.stringify(exportedSettings(settings, values))))).toMatchObject({ accent: '#ea580c', density: 'compact' });

        expect(importedValues(settings, { accent: '#F0A', glass: 'yes', density: 'cosy', logo: '/evil.png', unknown: true })).toEqual({ accent: '#ff00aa' });
        expect(importedValues(settings, { loginTagline: 'x'.repeat(500) }).loginTagline).toHaveLength(120);
        expect(importedValues(settings, ['#ffffff'])).toEqual({});
    });

    test('shows every setting in exactly one card', () => {
        const shown = categories.flatMap((category) => sectionsOf(category, settings).flatMap((section) => section.settings.map((setting) => setting.key)));

        expect([...shown].sort()).toEqual(settings.map((setting) => setting.key).sort());
    });

    test('reloads the preview for what React reads, and paints the rest in place', () => {
        expect(reloadsPreview('accent')).toBe(false);
        expect(reloadsPreview('glass')).toBe(false);
        expect(reloadsPreview('welcome')).toBe(true);
        expect(reloadsPreview('motion')).toBe(true);
        expect(reloadsPreview('logo')).toBe(true);
    });
});
