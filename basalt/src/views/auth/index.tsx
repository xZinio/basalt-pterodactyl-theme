import { Button, PanelLink } from '@pterodactyl/sdk';
import { Slot, type ViewProps } from '@pterodactyl/sdk/theme';
import { AuthForm, TextField } from './parts';

export function LoginPage({ model }: ViewProps<'page.auth.login'>) {
    const { fields, Captcha } = model;

    return (
        <AuthForm
            title='Sign in to continue'
            submit={model.submit}
            links={
                <PanelLink destination={model.forgotPassword} className='basalt-auth-link'>
                    Forgot password?
                </PanelLink>
            }
        >
            <TextField field={fields.username} label='Username or email' autoFocus />
            <TextField field={fields.password} label='Password' />
            <Button type='submit' size='xlarge' disabled={!model.canSubmit} isLoading={model.submitting}>
                Sign in
            </Button>
            <Slot name='auth.login.form.after' data={model.route} />
            {Captcha && <Captcha />}
        </AuthForm>
    );
}

export function ForgotPasswordPage({ model }: ViewProps<'page.auth.password'>) {
    const { Captcha } = model;

    return (
        <AuthForm
            title='Reset password'
            submit={model.submit}
            links={
                <PanelLink destination={model.login} className='basalt-auth-link'>
                    Back to sign in
                </PanelLink>
            }
        >
            <TextField field={model.fields.email} label='Email' autoFocus />
            <p className='text-sm text-muted-foreground'>Enter your account email to receive a link to reset your password.</p>
            <Button type='submit' size='xlarge' disabled={!model.canSubmit} isLoading={model.submitting}>
                Send reset link
            </Button>
            {Captcha && <Captcha />}
        </AuthForm>
    );
}

export function ResetPasswordPage({ model }: ViewProps<'page.auth.passwordReset'>) {
    const { fields, Captcha } = model;

    return (
        <AuthForm
            title='Choose a new password'
            submit={model.submit}
            links={
                <PanelLink destination={model.login} className='basalt-auth-link'>
                    Back to sign in
                </PanelLink>
            }
        >
            <p className='text-sm text-muted-foreground'>{model.email}</p>
            <TextField field={fields.password} label='New password' autoFocus />
            <TextField field={fields.passwordConfirmation} label='Confirm new password' />
            <Button type='submit' size='xlarge' disabled={!model.canSubmit} isLoading={model.submitting}>
                Reset password
            </Button>
            {Captcha && <Captcha />}
        </AuthForm>
    );
}

export function CheckpointPage({ model }: ViewProps<'page.auth.checkpoint'>) {
    const { recovery } = model;

    return (
        <AuthForm
            title='Two-factor authentication'
            submit={model.submit}
            links={
                <>
                    <button type='button' onClick={model.toggleRecovery} className='basalt-auth-link'>
                        {recovery ? 'Use an authentication code' : 'Use a recovery code'}
                    </button>
                    <PanelLink destination={model.login} className='basalt-auth-link'>
                        Back to sign in
                    </PanelLink>
                </>
            }
        >
            <TextField field={model.fields.code} label={recovery ? 'Recovery code' : 'Authentication code'} autoFocus />
            <Button type='submit' size='xlarge' disabled={!model.canSubmit} isLoading={model.submitting}>
                Continue
            </Button>
        </AuthForm>
    );
}
