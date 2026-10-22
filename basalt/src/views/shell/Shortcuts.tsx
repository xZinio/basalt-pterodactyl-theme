import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useCurrentUser, usePanelNavigate, useShortcut, type PanelDestination } from '@pterodactyl/sdk';
import { useShortcutsEnabled } from '../../lib/shortcuts';

// Keys typed in these are theirs, as for the panel's own shortcuts.
const owners = 'input, textarea, select, [contenteditable], [role="textbox"], [role="combobox"], [role="dialog"], [role="menu"], [role="listbox"]';
const modifiers = ['Shift', 'Control', 'Alt', 'Meta'];

/** `g` and then, within a second, a letter opens a page: h the servers, a the account, p the administration. */
function useGoTo(enabled: boolean, admin: boolean) {
    const navigate = usePanelNavigate();
    const cancel = useRef<() => void>(undefined);

    useEffect(() => () => cancel.current?.(), []);

    useShortcut(
        'g',
        () => {
            const pages: Record<string, PanelDestination> = { h: { to: '/' }, a: { to: '/account' } };
            if (admin) pages.p = { to: '/panel' };

            cancel.current?.();
            const next = (event: KeyboardEvent) => {
                if (modifiers.includes(event.key)) return;
                cancel.current?.();
                const page = pages[event.key.toLowerCase()];
                const typed = event.target instanceof Element && event.target.closest(owners);
                if (!page || typed || event.ctrlKey || event.metaKey || event.altKey) return;
                event.preventDefault();
                void navigate(page);
            };
            const timer = window.setTimeout(() => cancel.current?.(), 1000);
            window.addEventListener('keydown', next, true);
            cancel.current = () => {
                window.clearTimeout(timer);
                window.removeEventListener('keydown', next, true);
                cancel.current = undefined;
            };
        },
        { when: enabled }
    );
}

function Keys({ keys }: { keys: readonly string[] }) {
    return (
        <span className='inline-flex shrink-0 gap-1'>
            {keys.map((key) => (
                <kbd
                    key={key}
                    className='min-w-6 rounded-[6px] border border-b-2 border-border bg-(--card) px-1.5 py-px text-center text-xs leading-[1.5] font-semibold [font-family:inherit]'
                >
                    {key}
                </kbd>
            ))}
        </span>
    );
}

/** The panel-wide shortcuts, and the dialog that lists them. */
export default function Shortcuts({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
    const [enabled] = useShortcutsEnabled();
    const { rootAdmin } = useCurrentUser();
    const dialog = useRef<HTMLDialogElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const title = useId();

    useShortcut('?', () => setOpen(true), { when: enabled });
    useGoTo(enabled, rootAdmin);

    // A modal <dialog>: the page behind it is inert, Escape closes it and focus returns where it was.
    useEffect(() => {
        const element = dialog.current;
        if (!element || element.open === open) return;
        if (open) {
            element.showModal();
            panel.current?.focus();
        } else {
            element.close();
        }
    }, [open]);

    const rows: [label: string, keys: readonly string[]][] = [
        ['Search', ['/']],
        ['Overview', ['G', 'H']],
        ['Account', ['G', 'A']],
        ...(rootAdmin ? [['Administration', ['G', 'P']] as [string, readonly string[]]] : []),
        ['Show keyboard shortcuts', ['?']],
    ];

    return (
        // The explicit role lets the panel's shortcuts, which skip keys typed in a dialog, find it.
        <dialog
            ref={dialog}
            role='dialog'
            aria-labelledby={title}
            onClose={() => setOpen(false)}
            onClick={(event) => event.target === event.currentTarget && setOpen(false)}
            className='m-auto w-[calc(100%-2rem)] max-w-[26rem] bg-transparent p-0 text-foreground backdrop:bg-black/55 backdrop:backdrop-blur-[2px]'
        >
            <div
                ref={panel}
                tabIndex={-1}
                className='max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg border border-border bg-popover px-5 pt-4 pb-5 shadow-[0_24px_48px_rgb(0_0_0/0.4)] outline-none'
            >
                <div className='mb-3 flex items-center justify-between'>
                    <h2 id={title} className='text-base leading-6 font-semibold'>
                        Keyboard shortcuts
                    </h2>
                    <button
                        type='button'
                        aria-label='Close'
                        onClick={() => setOpen(false)}
                        className='inline-flex size-9 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground'
                    >
                        <X className='size-[18px]' aria-hidden />
                    </button>
                </div>
                <ul className='grid gap-0.5'>
                    {rows.map(([label, keys]) => (
                        <li key={label} className='flex items-center justify-between gap-4 rounded-md px-2 py-1.5 text-sm leading-[1.5] odd:bg-foreground/4'>
                            <span>{label}</span>
                            <Keys keys={keys} />
                        </li>
                    ))}
                </ul>
                {!enabled && <p className='mt-3 text-sm text-muted-foreground'>Shortcuts are off. Turn them on from your account page.</p>}
            </div>
        </dialog>
    );
}
