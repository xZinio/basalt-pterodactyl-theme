import { useEffect } from 'react';
import { useLocalState } from './local';

const KEY = 'basalt.privacy';

/**
 * Privacy mode blurs whatever is marked `data-sensitive` (emails, addresses, IPs) until it is
 * hovered, for screen sharing and streaming. It lives on <html> so the stylesheet can reach any page.
 */
export function usePrivacy(): [boolean, (on: boolean) => void] {
    const [on, setOn] = useLocalState(KEY, false);

    useEffect(() => {
        document.documentElement.toggleAttribute('data-basalt-privacy', on);
    }, [on]);

    return [on, setOn];
}
