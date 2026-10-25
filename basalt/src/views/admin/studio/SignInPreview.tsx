import { Button, Input, Label, Portal, useSiteSettings } from '@pterodactyl/sdk';
import { useThemeSettings } from '@pterodactyl/sdk/theme';
import type { ThemeSettings } from '../../../theme-types';
import { AuthPage } from '../../auth/AuthLayout';
import { AuthForm } from '../../auth/parts';

/**
 * The sign-in page as a visitor sees it, drawn over the studio's own screen in its preview frame.
 * It reads the draft's settings, and its form goes nowhere.
 */
export default function SignInPreview() {
    const { name } = useSiteSettings();
    const { logo } = useThemeSettings<ThemeSettings>();

    return (
        <Portal>
            <div className='fixed inset-0 z-50 overflow-y-auto bg-background'>
                <AuthPage brand={{ name, logoUrl: logo }}>
                    <AuthForm
                        title='Sign in to continue'
                        submit={() => undefined}
                        links={
                            <a href='#' onClick={(event) => event.preventDefault()} className='basalt-auth-link'>
                                Forgot password?
                            </a>
                        }
                    >
                        <div>
                            <Label htmlFor='preview-username'>Username or email</Label>
                            <Input id='preview-username' autoComplete='off' />
                        </div>
                        <div>
                            <Label htmlFor='preview-password'>Password</Label>
                            <Input id='preview-password' type='password' autoComplete='off' />
                        </div>
                        <Button type='submit' size='xlarge'>
                            Sign in
                        </Button>
                    </AuthForm>
                </AuthPage>
            </div>
        </Portal>
    );
}
