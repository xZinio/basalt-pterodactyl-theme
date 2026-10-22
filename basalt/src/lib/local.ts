import { useCallback, useEffect, useState } from 'react';

/** Per-browser conveniences (a collapsed sidebar, privacy blur). Storage can be unavailable, so every access is guarded. */
export function readLocal<T>(key: string, fallback: T): T {
    try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
        return fallback;
    }
}

export function writeLocal(key: string, value: unknown): void {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Private windows and blocked storage keep the value for this page only.
    }
}

const listeners = new Map<string, Set<() => void>>();

/** State kept in localStorage under `key`, shared by every component that reads the same key. */
export function useLocalState<T>(key: string, fallback: T): [T, (value: T) => void] {
    const [value, setValue] = useState<T>(() => readLocal(key, fallback));

    useEffect(() => {
        const sync = () => setValue(readLocal(key, fallback));
        let set = listeners.get(key);
        if (!set) listeners.set(key, (set = new Set()));
        set.add(sync);
        return () => {
            set.delete(sync);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    const update = useCallback(
        (next: T) => {
            writeLocal(key, next);
            for (const listener of listeners.get(key) ?? []) listener();
        },
        [key]
    );

    return [value, update];
}
