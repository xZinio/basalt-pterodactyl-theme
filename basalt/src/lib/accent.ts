import { readLocal, writeLocal } from './local';

/** The colours the account page offers beside the panel's own accent. */
export const accentPresets = ['#5865f2', '#3b82f6', '#06b6d4', '#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#a855f7'] as const;

export const isAccent = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

const KEY = 'basalt.accent';

/**
 * Paints a personal accent, or the panel's with null. It goes on <html> as an inline token, which
 * outranks the theme setting's, and into this browser's storage, so the next page load paints it
 * before the user's preferences arrive.
 */
export function applyAccent(color: string | null): void {
    const root = document.documentElement;
    if (isAccent(color)) root.style.setProperty('--basalt-primary', color);
    else root.style.removeProperty('--basalt-primary');
    writeLocal(KEY, isAccent(color) ? color : null);
}

/** The accent this browser last painted, for the entry to paint again before the first render. */
export const cachedAccent = (): string | null => {
    const color = readLocal<unknown>(KEY, null);
    return isAccent(color) ? color : null;
};
