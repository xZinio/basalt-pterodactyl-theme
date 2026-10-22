import { useEffect, useState } from 'react';
import { Avatar, cn } from '@pterodactyl/sdk';
import { useThemeSettings } from '@pterodactyl/sdk/theme';
import type { ThemeSettings } from '../theme-types';

const hashes = new Map<string, Promise<string>>();

/** Gravatar addresses accept a SHA-256 of the trimmed, lower-cased email. */
function emailHash(email: string): Promise<string> {
    const key = email.trim().toLowerCase();
    let hash = hashes.get(key);
    if (!hash) {
        hash = crypto.subtle
            .digest('SHA-256', new TextEncoder().encode(key))
            .then((buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join(''));
        hashes.set(key, hash);
    }
    return hash;
}

/**
 * The user's uploaded picture; without one, their Gravatar (a silhouette when they have none),
 * unless the theme's Gravatar setting is off or the browser cannot hash, then the panel's pattern.
 */
export default function UserAvatar({
    user,
    size = 32,
    className,
}: {
    user: { uuid: string; email: string; avatar?: string | null };
    size?: number;
    className?: string;
}) {
    const { gravatar } = useThemeSettings<ThemeSettings>();
    const [src, setSrc] = useState<string | null>(user.avatar ?? null);

    useEffect(() => {
        if (user.avatar) {
            setSrc(user.avatar);
            return;
        }
        if (!gravatar || typeof crypto === 'undefined' || !crypto.subtle) {
            setSrc(null);
            return;
        }
        let cancelled = false;
        emailHash(user.email).then(
            (hash) => !cancelled && setSrc(`https://gravatar.com/avatar/${hash}?s=${size * 2}&d=mp`),
            () => !cancelled && setSrc(null)
        );
        return () => {
            cancelled = true;
        };
    }, [user.avatar, user.email, gravatar, size]);

    return (
        <span
            className={cn('inline-flex shrink-0 overflow-hidden rounded-full bg-popover', className)}
            style={{ width: size, height: size }}
        >
            {src ? (
                <img src={src} alt='' width={size} height={size} className='size-full object-cover' onError={() => setSrc(null)} />
            ) : (
                <Avatar name={user.uuid} size={size} />
            )}
        </span>
    );
}
