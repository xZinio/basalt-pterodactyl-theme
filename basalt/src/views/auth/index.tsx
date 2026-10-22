import { Button, Input, Label, PanelLink } from '@pterodactyl/sdk';
import { Slot, type ViewProps } from '@pterodactyl/sdk/theme';
import { AuthForm, TextField, authLinkClass } from './parts';

export function LoginPage({ model }: ViewProps<'page.auth.login'>) {
    const { fields, Captcha } = model;

    return (
        <AuthForm
            title='Sign in to continue'
            submit={model.submit}
            links={
                <PanelLink destination={model.forgotPassword} className={authLinkClass}>
                    Forgot password?
                </PanelLink>
            }
        >
            <TextField field={fields.username} label='Username or email' />
            <TextField field={fields.password} label='Password' />
            {Captcha && <Captcha />}
            <Button type='submit' size='xlarge' disabled={!model.canSubmit} isLoading={model.submitting}>
                Sign in
            </Button>
            <Slot name='auth.login.form.after' data={model.route} />
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
                <PanelLink destination={model.login} className={authLinkClass}>
                    Back to sign in
                </PanelLink>
            }
        >
            <TextField field={model.fields.email} label='Email' autoFocus />
            <p className='text-sm leading-snug text-muted-foreground'>
                Enter your account email to receive a link to reset your password.
            </p>
            {Captcha && <Captcha />}
            <Button type='submit' size='xlarge' disabled={!model.canSubmit} isLoading={model.submitting}>
                Send reset link
            </Button>
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
                <PanelLink destination={model.login} className={authLinkClass}>
                    Back to sign in
                </PanelLink>
            }
        >
            <div>
                <Label htmlFor='password-reset-email'>Email</Label>
                <Input id='password-reset-email' value={model.email} disabled readOnly />
            </div>
            <TextField
                field={fields.password}
                label='New password'
                description='Passwords must be at least 8 characters in length.'
            />
            <TextField field={fields.passwordConfirmation} label='Confirm new password' />
            {Captcha && <Captcha />}
            <Button type='submit' size='xlarge' disabled={!model.canSubmit} isLoading={model.submitting}>
                Reset password
            </Button>
        </AuthForm>
    );
}

export function CheckpointPage({ model }: ViewProps<'page.auth.checkpoint'>) {
    const { recovery } = model;

    return (
        <AuthForm
            title='Two-step verification'
            submit={model.submit}
            links={
                <>
                    <button
                        type='button'
                        onClick={model.toggleRecovery}
                        className={`cursor-pointer appearance-none border-0 bg-transparent p-0 ${authLinkClass}`}
                    >
                        {recovery ? 'I have my device' : "I've lost my device"}
                    </button>
                    <PanelLink destination={model.login} className={authLinkClass}>
                        Back to sign in
                    </PanelLink>
                </>
            }
        >
            <TextField
                field={model.fields.code}
                label={recovery ? 'Recovery code' : 'Authentication code'}
                description={
                    recovery
                        ? 'Enter one of the recovery codes you saved when you set up two-step verification.'
                        : 'Enter the code your authenticator app shows for this account.'
                }
                autoFocus
            />
            <Button type='submit' size='xlarge' disabled={!model.canSubmit} isLoading={model.submitting}>
                Continue
            </Button>
        </AuthForm>
    );
}
