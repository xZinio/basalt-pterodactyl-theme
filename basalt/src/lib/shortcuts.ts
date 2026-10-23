import { useThemeSettings } from '@pterodactyl/sdk/theme';
import type { ThemeSettings } from '../theme-types';
import { useLocalState } from './local';

/** Whether administrators let users move around with keyboard shortcuts. */
export const useShortcutsAllowed = (): boolean => useThemeSettings<Partial<ThemeSettings>>().keyboardShortcuts !== false;

/** Keyboard shortcuts are on where administrators allow them, unless the user turned them off on their account page. */
export function useShortcutsEnabled(): [boolean, (on: boolean) => void] {
    const allowed = useShortcutsAllowed();
    const [on, setOn] = useLocalState('basalt.shortcuts', true);

    return [allowed && on, setOn];
}
