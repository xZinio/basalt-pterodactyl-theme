const OPEN = 'basalt:search';

/** Opens the panel's server search from anywhere on the page, such as the top bar's search button. */
export const openSearch = (): void => {
    window.dispatchEvent(new Event(OPEN));
};

/** Calls `show` while `openSearch` is asked to open the search; returns the unsubscribe function. */
export function onOpenSearch(show: () => void): () => void {
    window.addEventListener(OPEN, show);
    return () => window.removeEventListener(OPEN, show);
}

/** The Search shortcut key setting as a key: one letter or digit, or null, which turns the shortcut off. */
export function searchKey(value: string): string | null {
    const key = value.trim().toLowerCase();
    return /^[a-z0-9]$/.test(key) ? key : null;
}
