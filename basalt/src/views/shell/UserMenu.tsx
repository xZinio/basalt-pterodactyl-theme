import { EllipsisVertical, Eye, EyeOff, Keyboard, LifeBuoy, LogOut, Moon, Sun, User, UserCog } from 'lucide-react';
import { DropdownMenu, cn } from '@pterodactyl/sdk';
import { useThemeSettings, type AppLayoutModel } from '@pterodactyl/sdk/theme';
import UserAvatar from '../../components/UserAvatar';
import { applyAccent } from '../../lib/accent';
import { usePrivacy, usePrivacyAllowed } from '../../lib/privacy';
import { useShortcutsAllowed } from '../../lib/shortcuts';
import type { ThemeSettings } from '../../theme-types';

/**
 * The signed-in user at the foot of the sidebar or the end of a bar; it opens the account menu.
 * In the rail it shows the avatar alone; in the bottom bar, the avatar and the menu's dots, and on
 * a narrow screen the avatar alone again.
 */
export default function UserMenu({
    model,
    collapsed,
    placement = 'sidebar',
    onShortcuts,
}: {
    model: AppLayoutModel;
    collapsed: boolean;
    placement?: 'sidebar' | 'top' | 'bottom';
    onShortcuts: () => void;
}) {
    const { user, setScheme, scheme } = model;
    const { supportUrl } = useThemeSettings<ThemeSettings>();
    const [privacy, setPrivacy] = usePrivacy();
    const privacyAllowed = usePrivacyAllowed();
    const shortcutsAllowed = useShortcutsAllowed();

    return (
        <DropdownMenu
            className={cn('basalt-user-menu', placement === 'top' && 'basalt-user-menu-below')}
            triggerClassName={cn(
                'flex w-full min-w-0 items-center gap-2.5 rounded-(--basalt-control-radius) border-0 bg-transparent p-2 text-left text-foreground transition-colors',
                'hover:bg-sidebar-accent data-popup-open:bg-sidebar-accent',
                collapsed && 'justify-center p-2',
                placement === 'bottom' && 'w-auto max-[700px]:p-1.5'
            )}
            triggerContent={
                <>
                    <UserAvatar user={user} size={32} />
                    {!collapsed && placement !== 'bottom' && (
                        <span className='min-w-0 flex-1'>
                            <span className='block truncate text-base leading-[1.2]'>{user.username}</span>
                            <span className='block truncate text-xs leading-[1.2] text-muted-foreground' data-sensitive>
                                {user.email}
                            </span>
                        </span>
                    )}
                    {!collapsed && (
                        <EllipsisVertical className={cn('size-[18px] shrink-0 text-muted-foreground', placement === 'bottom' && 'max-[700px]:hidden')} aria-hidden />
                    )}
                    <span className='sr-only'>Account menu</span>
                </>
            }
        >
            {user.rootAdmin && (
                <DropdownMenu.Item icon={UserCog} destination={{ to: '/panel' }}>
                    Admin
                </DropdownMenu.Item>
            )}
            <DropdownMenu.Item icon={User} destination={{ to: '/account' }}>
                Account Settings
            </DropdownMenu.Item>
            {supportUrl && (
                <DropdownMenu.Item icon={LifeBuoy} onClick={() => window.open(supportUrl, '_blank', 'noopener,noreferrer')}>
                    Support
                </DropdownMenu.Item>
            )}
            {setScheme && (
                <DropdownMenu.Item icon={scheme === 'dark' ? Sun : Moon} onClick={() => setScheme(scheme === 'dark' ? 'light' : 'dark')}>
                    {scheme === 'dark' ? 'Light scheme' : 'Dark scheme'}
                </DropdownMenu.Item>
            )}
            {privacyAllowed && (
                <DropdownMenu.Item icon={privacy ? Eye : EyeOff} onClick={() => setPrivacy(!privacy)}>
                    {privacy ? 'Show sensitive data' : 'Hide sensitive data'}
                </DropdownMenu.Item>
            )}
            {shortcutsAllowed && (
                <DropdownMenu.Item icon={Keyboard} onClick={onShortcuts}>
                    Keyboard shortcuts
                </DropdownMenu.Item>
            )}
            {/* The next person to sign in on this browser starts from the panel's accent. */}
            <DropdownMenu.Item
                icon={LogOut}
                onClick={() => {
                    applyAccent(null);
                    model.signOut();
                }}
            >
                Sign out
            </DropdownMenu.Item>
        </DropdownMenu>
    );
}
