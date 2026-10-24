import { useEffect } from 'react';
import { useShortcut } from '@pterodactyl/sdk';
import { useThemeSettings, type ViewProps } from '@pterodactyl/sdk/theme';
import { onOpenSearch, searchKey } from '../../lib/search';
import { useShortcutsEnabled } from '../../lib/shortcuts';
import type { ThemeSettings } from '../../theme-types';

/**
 * The panel's server search, which `/` opens with the keyboard shortcuts, and Cmd or Ctrl with the
 * Search shortcut key, besides its own Cmd+/ (Ctrl+/); the top bar's search button opens it too.
 */
export default function Search({ model, Default, className }: ViewProps<'app.search'>) {
    const [enabled] = useShortcutsEnabled();
    const settings = useThemeSettings<ThemeSettings>();
    const key = searchKey(settings.searchKey);

    useShortcut('/', model.show, { when: enabled });
    useShortcut(`mod+${key ?? 'k'}`, model.show, { when: settings.searchShortcut && key !== null });
    useEffect(() => onOpenSearch(model.show), [model.show]);

    return <Default className={className} />;
}
