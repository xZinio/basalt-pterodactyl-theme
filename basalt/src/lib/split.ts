import { useSyncExternalStore } from 'react';
import { resolvePanelDestination } from '@pterodactyl/sdk';
import { readLocal } from './local';

/** A page open beside the current one, or in a floating window over it. */
export interface Split {
    readonly href: string;
    readonly label: string;
    readonly mode: 'side' | 'float';
    /** Changes when the same page is opened again, so its frame loads it anew. */
    readonly nonce: number;
}

/** The name of a split's frame: the shell draws a page in it without its navigation. */
export const EMBED_FRAME = 'basalt-embed';

/** The side pane's width and the window's box, which each browser keeps. */
export const SIDE_WIDTH = 'basalt.split.width';
export const WINDOW_BOX = 'basalt.split.window';

const STORE = 'basalt.split';

/** Whether this page is drawn in a split's frame. */
export const inEmbedFrame = (): boolean => typeof window !== 'undefined' && window.name === EMBED_FRAME && window.parent !== window;

/**
 * A link's address as a split can open it: a page of this panel, not the sign-in pages or the
 * studio, as a path with its query and hash; null for anything else.
 */
export function splitHref(href: string): string | null {
    try {
        const url = new URL(href, window.location.origin);
        const studio = resolvePanelDestination({ extension: 'basalt', screen: 'studio' }).pathname.replace(/\/+$/, '');
        if (url.origin !== window.location.origin || /^\/auth(\/|$)/.test(url.pathname) || url.pathname.replace(/\/+$/, '') === studio) return null;
        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return null;
    }
}

function restore(): Split | null {
    try {
        const saved = JSON.parse(window.sessionStorage.getItem(STORE) ?? 'null') as Partial<Split> | null;
        if (!saved || typeof saved.href !== 'string' || !splitHref(saved.href) || (saved.mode !== 'side' && saved.mode !== 'float')) return null;
        return { href: saved.href, label: String(saved.label ?? ''), mode: saved.mode, nonce: 0 };
    } catch {
        return null;
    }
}

// The tab's split survives a reload of the page beside it.
let current: Split | null = typeof window === 'undefined' ? null : restore();
const listeners = new Set<() => void>();

/** Opens a split, changes it, or closes it with null. */
export function setSplit(split: Split | null): void {
    current = split;
    try {
        if (split) window.sessionStorage.setItem(STORE, JSON.stringify(split));
        else window.sessionStorage.removeItem(STORE);
    } catch {
        // Storage can be unavailable; the split still opens for this page.
    }
    listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

/** The open split, if any. */
export const useSplit = (): Split | null =>
    useSyncExternalStore(
        subscribe,
        () => current,
        () => null
    );

/** A split frame's page moved on: the split follows it, with the page's title as its label. */
export function followSplit(href: string, label: string): void {
    if (!current || (current.href === href && current.label === label) || !splitHref(href)) return;
    setSplit({ ...current, href, label: label || current.label });
}

/** The side pane's width: kept between 320px and the window's width less 480px. */
export const sideWidth = (width: number): number => Math.max(320, Math.min(width, window.innerWidth - 480));

export interface WindowBox {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
}

/** The floating window's box, kept at least 360 by 260 and 8px inside the browser's window. */
export function windowBox(box: WindowBox): WindowBox {
    const w = Math.max(360, Math.min(box.w, window.innerWidth - 16));
    const h = Math.max(260, Math.min(box.h, window.innerHeight - 16));
    return { w, h, x: Math.max(8, Math.min(box.x, window.innerWidth - w - 8)), y: Math.max(8, Math.min(box.y, window.innerHeight - h - 8)) };
}

export const savedSideWidth = (): number => sideWidth(readLocal(SIDE_WIDTH, Math.round(window.innerWidth * 0.42)));
export const savedWindowBox = (): WindowBox =>
    windowBox(readLocal<WindowBox>(WINDOW_BOX, { w: 720, h: 480, x: window.innerWidth - 744, y: window.innerHeight - 504 }));
