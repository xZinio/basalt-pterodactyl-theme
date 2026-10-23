import { useEffect } from 'react';
import { useThemeSettings } from '@pterodactyl/sdk/theme';
import type { ThemeSettings } from '../theme-types';
import { useLocalState } from './local';

const KEY = 'basalt.privacy';

/** Whether administrators let users turn privacy mode on. */
export const usePrivacyAllowed = (): boolean => useThemeSettings<Partial<ThemeSettings>>().privacyMode !== false;

/**
 * Privacy mode blurs whatever is marked `data-sensitive` (emails, addresses, IPs) until it is
 * hovered, for screen sharing and streaming. It lives on <html> so the stylesheet can reach any page.
 */
export function usePrivacy(): [boolean, (on: boolean) => void] {
    const allowed = usePrivacyAllowed();
    const [on, setOn] = useLocalState(KEY, false);
    const active = allowed && on;

    useEffect(() => {
        document.documentElement.toggleAttribute('data-basalt-privacy', active);
    }, [active]);

    return [active, setOn];
}
