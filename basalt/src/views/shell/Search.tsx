import { useShortcut } from '@pterodactyl/sdk';
import type { ViewProps } from '@pterodactyl/sdk/theme';
import { useShortcutsEnabled } from '../../lib/shortcuts';

/** The panel's server search, which `/` and Cmd+K (Ctrl+K) open as well as its own Cmd+/ (Ctrl+/). */
export default function Search({ model, Default, className }: ViewProps<'app.search'>) {
    const [enabled] = useShortcutsEnabled();

    useShortcut('/', model.show, { when: enabled });
    useShortcut('mod+k', model.show, { when: enabled });

    return <Default className={className} />;
}
