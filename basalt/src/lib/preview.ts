/** The name the studio gives its preview frames. */
export const PREVIEW_FRAME = 'basalt-studio-preview';

/** What the studio shares with its preview frames: the draft settings and what they write. */
export interface StudioDraft {
    /** Every setting's draft value, keyed as in the manifest. */
    readonly settings: Readonly<Record<string, unknown>>;
    /** Custom property => CSS value, as the panel writes saved settings into `<style id="theme-settings">`. */
    readonly tokens: Readonly<Record<string, string>>;
    /** `<html>` attribute => value. */
    readonly attributes: Readonly<Record<string, string>>;
}

declare global {
    interface Window {
        /** Set by the studio on itself; its preview frames read it from their parent. */
        basaltStudio?: StudioDraft;
    }
}

type Bootstrap = { SiteConfiguration?: { theme?: { settings?: Record<string, unknown> } } };

/** Whether this page is the studio's preview of another page. */
export const inPreviewFrame = (): boolean => typeof window !== 'undefined' && window.name === PREVIEW_FRAME && window.parent !== window;

/** Gives a page's React the settings: `useThemeSettings` reads them as it renders. */
function provideSettings(settings: Readonly<Record<string, unknown>>): void {
    const theme = (window as Window & Bootstrap).SiteConfiguration?.theme;
    if (theme) theme.settings = { ...theme.settings, ...settings };
}

/** Writes settings' tokens and attributes into a document, the way the panel writes saved settings. */
function writeSettings(doc: Document, draft: StudioDraft): void {
    let style = doc.getElementById('theme-settings');
    if (!style) {
        style = doc.createElement('style');
        style.id = 'theme-settings';
        doc.head.append(style);
    }

    const declarations = Object.entries(draft.tokens)
        .map(([name, value]) => `${name}:${value};`)
        .join('');
    // Doubled, as the panel writes it, so the settings outrank the stylesheet's own :root and scheme rules.
    style.textContent = declarations ? `:root:root{${declarations}}` : '';

    for (const [name, value] of Object.entries(draft.attributes)) doc.documentElement.setAttribute(name, value);
}

/** Writes a draft into a preview frame's document. A personal accent is inline tokens, which would hide the draft's. */
export function applyDraft(doc: Document, draft: StudioDraft): void {
    writeSettings(doc, draft);
    for (const token of ['--basalt-primary', '--basalt-accent']) doc.documentElement.style.removeProperty(token);
}

/**
 * In a preview frame, swaps the saved settings for the studio's draft before the panel renders:
 * React reads the draft's values, and the stylesheet its tokens and attributes. Returns whether it
 * did, so the entry leaves the administrator's personal accent out of the preview.
 */
export function adoptDraft(): boolean {
    if (!inPreviewFrame()) return false;

    let draft: StudioDraft | undefined;
    try {
        draft = window.parent.basaltStudio;
    } catch {
        return false;
    }
    if (!draft) return false;

    provideSettings({ ...draft.settings, userAccent: false });
    applyDraft(document, draft);
    return true;
}

/** After a save, the studio's own page takes the saved settings, as a reload would give it them. */
export function adoptSaved(saved: StudioDraft): void {
    provideSettings(saved.settings);
    writeSettings(document, saved);
}
