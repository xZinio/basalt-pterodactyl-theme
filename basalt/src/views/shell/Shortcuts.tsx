import { Dialog, usePanelNavigate, useShortcut } from '@pterodactyl/sdk';
import { useLocalState } from '../../lib/local';

/** Keyboard shortcuts are on unless the user turned them off on their account page. */
export const useShortcutsEnabled = () => useLocalState('basalt.shortcuts', true);

const apple = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** `mod+/` as this device names it: ⌘/ on Apple devices, Ctrl+/ elsewhere. */
const keyLabel = (keys: string) => keys.replace('mod+', apple ? '⌘' : 'Ctrl+');

const list = [
    ['?', 'Show this list'],
    ['d', 'Go to your servers'],
    ['a', 'Go to your account'],
    ['[', 'Collapse or expand the sidebar'],
    ['mod+/', 'Search servers'],
] as const;

/** The panel-wide shortcuts, and the dialog that lists them. */
export default function Shortcuts({
    open,
    setOpen,
    toggleSidebar,
}: {
    open: boolean;
    setOpen: (open: boolean) => void;
    toggleSidebar: () => void;
}) {
    const [enabled] = useShortcutsEnabled();
    const navigate = usePanelNavigate();

    useShortcut('?', () => setOpen(true), { when: enabled });
    useShortcut('d', () => void navigate({ to: '/' }), { when: enabled });
    useShortcut('a', () => void navigate({ to: '/account' }), { when: enabled });
    useShortcut('[', toggleSidebar, { when: enabled });

    return (
        <Dialog open={open} onClose={() => setOpen(false)} title='Keyboard shortcuts'>
            <ul className='mb-6 divide-y divide-border/70 text-sm'>
                {list.map(([keys, label]) => (
                    <li key={keys} className='flex items-center justify-between gap-4 py-2.5'>
                        <span className='text-foreground'>{label}</span>
                        <kbd className='min-w-8 rounded-md border border-border bg-popover px-2 py-0.5 text-center font-mono text-xs text-foreground'>
                            {keyLabel(keys)}
                        </kbd>
                    </li>
                ))}
            </ul>
            {!enabled && (
                <p className='mb-6 text-sm text-muted-foreground'>Shortcuts are off. Turn them on from your account page.</p>
            )}
        </Dialog>
    );
}
