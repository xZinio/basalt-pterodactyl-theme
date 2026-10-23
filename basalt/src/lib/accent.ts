import { readLocal, writeLocal } from './local';
import { inPreviewFrame } from './preview';

/** The colours the account page offers beside the panel's own accent. */
export const accentPresets = ['#5865f2', '#3b82f6', '#06b6d4', '#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#a855f7'] as const;

export const isAccent = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

const KEY = 'basalt.accent';

/** The inline tokens a personal accent sets: the accent, and the hover and focus colour lightened from it. */
const ACCENT_TOKENS = ['--basalt-primary', '--basalt-accent'] as const;

/**
 * Paints a personal accent, or the panel's with null. It goes on <html> as inline tokens, which
 * outrank the theme settings', and into this browser's storage, so the next page load paints it
 * before the user's preferences arrive.
 */
export function applyAccent(color: string | null): void {
    const root = document.documentElement;
    if (isAccent(color)) {
        root.style.setProperty('--basalt-primary', color);
        root.style.setProperty('--basalt-accent', `color-mix(in srgb, ${color} 80%, white)`);
    } else {
        for (const token of ACCENT_TOKENS) root.style.removeProperty(token);
    }
    // A studio preview frame shares this browser's storage with the administrator's own pages.
    if (!inPreviewFrame()) writeLocal(KEY, isAccent(color) ? color : null);
}

/** The accent this browser last painted, for the entry to paint again before the first render. */
export const cachedAccent = (): string | null => {
    const color = readLocal<unknown>(KEY, null);
    return isAccent(color) ? color : null;
};
