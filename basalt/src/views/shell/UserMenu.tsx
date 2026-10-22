import { EllipsisVertical, Eye, EyeOff, Keyboard, LifeBuoy, LogOut, Moon, Sun, User, UserCog } from 'lucide-react';
import { DropdownMenu, cn } from '@pterodactyl/sdk';
import { useThemeSettings, type AppLayoutModel } from '@pterodactyl/sdk/theme';
import UserAvatar from '../../components/UserAvatar';
import { applyAccent } from '../../lib/accent';
import { usePrivacy } from '../../lib/privacy';
import type { ThemeSettings } from '../../theme-types';

/** The signed-in user at the foot of the sidebar; it opens the account menu. */
export default function UserMenu({
    model,
    collapsed,
    onShortcuts,
}: {
    model: AppLayoutModel;
    collapsed: boolean;
    onShortcuts: () => void;
}) {
    const { user, setScheme, scheme } = model;
    const { supportUrl } = useThemeSettings<ThemeSettings>();
    const [privacy, setPrivacy] = usePrivacy();

    return (
        <DropdownMenu
            className='basalt-user-menu'
            triggerClassName={cn(
                'flex w-full min-w-0 items-center gap-2.5 rounded-lg border-0 bg-transparent p-2 text-left text-foreground transition-colors',
                'hover:bg-foreground/[0.06] data-popup-open:bg-popover',
                collapsed && 'justify-center p-1.5'
            )}
            triggerContent={
                <>
                    <UserAvatar user={user} size={32} />
                    {!collapsed && (
                        <span className='min-w-0 flex-1'>
                            <span className='block truncate text-base leading-[1.2]'>{user.username}</span>
                            <span className='block truncate text-xs leading-[1.2] text-muted-foreground' data-sensitive>
                                {user.email}
                            </span>
                        </span>
                    )}
                    {!collapsed && <EllipsisVertical className='size-[18px] shrink-0 text-muted-foreground' aria-hidden />}
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
            <DropdownMenu.Item icon={privacy ? Eye : EyeOff} onClick={() => setPrivacy(!privacy)}>
                {privacy ? 'Show sensitive data' : 'Hide sensitive data'}
            </DropdownMenu.Item>
            <DropdownMenu.Item icon={Keyboard} onClick={onShortcuts}>
                Keyboard shortcuts
            </DropdownMenu.Item>
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
