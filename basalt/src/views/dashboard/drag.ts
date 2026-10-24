import { useLayoutEffect, useRef, useState, type DragEvent } from 'react';

/** The data type a dragged server carries: its UUID. */
export const SERVER_DRAG = 'application/x-basalt-server';

// The server being dragged: a drop target can only read the drag's data on drop.
let dragged: string | null = null;

export const setDraggedServer = (uuid: string | null): void => {
    dragged = uuid;
};

export const carriesServer = (event: DragEvent): boolean => event.dataTransfer.types.includes(SERVER_DRAG);

/**
 * A place a dragged server can be dropped on, such as a folder: marked `data-over` while a server
 * it takes is held over it. Over a server of a sorted list, the list takes the drag instead.
 */
export function useServerDrop(drop: (uuid: string) => void, accepts?: (uuid: string) => boolean) {
    const [over, setOver] = useState(false);

    return {
        over,
        props: {
            onDragOver: (event: DragEvent) => {
                if ((event.target as Element).closest('[data-sortable]') || (accepts && dragged !== null && !accepts(dragged))) {
                    setOver(false);
                    return;
                }
                if (!carriesServer(event)) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setOver(true);
            },
            onDragLeave: (event: DragEvent) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
            },
            onDrop: (event: DragEvent) => {
                setOver(false);
                const uuid = event.dataTransfer.getData(SERVER_DRAG);
                if (!uuid) return;
                event.preventDefault();
                drop(uuid);
            },
        },
    };
}

/**
 * Slides a list's items from where they were to where they are after each render, for a short
 * while after `active` was last true: the servers making room for one being dragged.
 */
export function useReflow<T extends HTMLElement>(active: boolean, motion: boolean) {
    const list = useRef<T>(null);
    const positions = useRef(new Map<string, { x: number; y: number }>());
    const until = useRef(0);
    if (active) until.current = Date.now() + 450;

    useLayoutEffect(() => {
        const element = list.current;
        if (!element) return;

        const origin = element.getBoundingClientRect();
        const animate = motion && Date.now() < until.current;
        const next = new Map<string, { x: number; y: number }>();
        element.querySelectorAll<HTMLElement>('[data-flip]').forEach((item) => {
            if (item.hasAttribute('data-hidden')) return;
            const box = item.getBoundingClientRect();
            const key = item.dataset.flip!;
            const at = { x: box.left - origin.left, y: box.top - origin.top };
            next.set(key, at);

            const before = positions.current.get(key);
            if (!animate || !before) return;
            const dx = before.x - at.x;
            const dy = before.y - at.y;
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
            item.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
        });
        positions.current = next;
    });

    return list;
}
