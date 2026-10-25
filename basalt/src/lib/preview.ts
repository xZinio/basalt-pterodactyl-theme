import { useEffect, useState } from 'react';

/** The name the studio gives its preview frames. */
export const PREVIEW_FRAME = 'basalt-studio-preview';

/** The studio's word to its preview frame that the draft changed, for what the frame follows without reloading. */
export const DRAFT_MESSAGE = 'basalt-draft';

/** A preview frame's word to the studio that a block of the server dashboard was clicked. */
export const SELECT_BLOCK_MESSAGE = 'basalt-select-block';

/** What the studio shares with its preview frames: the draft settings and what they write. */
export interface StudioDraft {
    /** Every setting's draft value, keyed as in the manifest. */
    readonly settings: Readonly<Record<string, unknown>>;
    /** Custom property => CSS value, as the panel writes saved settings into `<style id="theme-settings">`. */
    readonly tokens: Readonly<Record<string, string>>;
    /** `<html>` attribute => value. */
    readonly attributes: Readonly<Record<string, string>>;
    /**
     * While the studio shows the Server dashboard settings, the block open in them, or null for
     * none: the dashboard in the frame marks it, and a click on a block opens that one.
     */
    readonly focus?: string | null;
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

function studioDraft(): StudioDraft | null {
    if (!inPreviewFrame()) return null;
    try {
        return window.parent.basaltStudio ?? null;
    } catch {
        return null;
    }
}

/** In a preview frame, the studio's draft, again each time the studio says it changed; null on any other page. */
export function usePreviewDraft(): StudioDraft | null {
    const [draft, setDraft] = useState(studioDraft);

    useEffect(() => {
        if (!inPreviewFrame()) return;

        const receive = (event: MessageEvent) => {
            if (event.origin !== window.location.origin || event.source !== window.parent) return;
            if ((event.data as { type?: unknown } | null)?.type === DRAFT_MESSAGE) setDraft(studioDraft());
        };
        window.addEventListener('message', receive);
        return () => window.removeEventListener('message', receive);
    }, []);

    return draft;
}

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

    const draft = studioDraft();
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
