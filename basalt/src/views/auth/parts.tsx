import { useId, type ReactNode } from 'react';
import { Form, Input, Label, useSiteSettings, type FieldModel } from '@pterodactyl/sdk';
import { useThemeSettings } from '@pterodactyl/sdk/theme';
import BrandMark from '../../components/BrandMark';
import { safeUrl } from '../../lib/links';
import type { ThemeSettings } from '../../theme-types';
import { AuthLogo } from './AuthLayout';

/** An https address without credentials in it, or null. */
function httpsUrl(value: string): string | null {
    try {
        const url = new URL(value.trim());
        return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
    } catch {
        return null;
    }
}

/** The banner of the banner layouts: the logo, the panel's name and a line under it over the background image. */
function Banner({ name, logo }: { name: string; logo: string | null }) {
    return (
        <div className='basalt-auth-banner'>
            {logo ? <img src={logo} alt='' className='mb-auto h-10 w-auto self-start object-contain' /> : <BrandMark className='mb-auto size-10' />}
            <strong>{name}</strong>
            <span className='text-sm opacity-85'>Sign in to manage your servers.</span>
        </div>
    );
}

/**
 * A sign-in page: its title, form and links on the card, which the Layout setting places alone,
 * beside a banner, or on one side of the page, with the copyright line under it. The Support link
 * goes under the form or above it, by the Support link position setting.
 */
export function AuthForm({ title, submit, links, children }: { title: string; submit: () => void; links: ReactNode; children: ReactNode }) {
    const settings = useThemeSettings<ThemeSettings>();
    const site = useSiteSettings();
    const brand = { name: site.name, logoUrl: settings.logo };
    const layout = settings.loginLayout;
    const supportUrl = settings.supportUrl.trim();
    const socialUrl = httpsUrl(settings.socialUrl);
    const supportAbove = settings.supportPosition === 'card';

    const support = safeUrl(supportUrl) && (
        <a href={supportUrl} target='_blank' rel='noopener noreferrer' className='basalt-auth-link'>
            Support
        </a>
    );

    const card = (
        <div className='basalt-auth-card'>
            {(settings.logoPosition === 'card' || layout === 'panels') && <AuthLogo brand={brand} />}
            <h1 className='basalt-auth-title'>{title}</h1>
            {supportAbove && support && <div className='basalt-auth-links mt-0 mb-5'>{support}</div>}
            <Form form={{ handleSubmit: submit }} className='basalt-auth-form'>
                {children}
            </Form>
            <div className='basalt-auth-links'>
                {links}
                {!supportAbove && support}
                {socialUrl && (
                    <a href={socialUrl} target='_blank' rel='me noopener noreferrer' className='basalt-auth-link'>
                        Follow us
                    </a>
                )}
            </div>
        </div>
    );

    const copyright = (
        <p className='basalt-auth-copy'>
            &copy; 2015 - <span suppressHydrationWarning>{new Date().getFullYear()}</span>{' '}
            <a href='https://pterodactyl.io' target='_blank' rel='noopener nofollow noreferrer'>
                Pterodactyl Software
            </a>
        </p>
    );

    const banner = <Banner name={brand.name} logo={settings.loginLogo ?? settings.logo} />;

    if (layout === 'panels') {
        return (
            <div className='basalt-auth-panels'>
                {banner}
                <div>
                    {card}
                    {copyright}
                </div>
            </div>
        );
    }

    if (layout === 'banner' || layout === 'floating') {
        return (
            <>
                <div className='basalt-auth-split'>
                    {banner}
                    {card}
                </div>
                {copyright}
            </>
        );
    }

    return (
        <>
            {card}
            {copyright}
        </>
    );
}

/** Label and input for an engine field, with its error under it; the field's own props pass through untouched. */
export function TextField({ field, label, autoFocus }: { field: FieldModel; label: string; autoFocus?: boolean }) {
    const id = useId();
    const errorId = `${id}-error`;

    return (
        <div>
            <Label htmlFor={id}>{label}</Label>
            <Input
                {...field.fieldProps}
                id={id}
                autoFocus={autoFocus}
                aria-invalid={field.error ? true : undefined}
                aria-describedby={field.error ? errorId : undefined}
                $hasError={!!field.error}
            />
            {field.error && (
                <p id={errorId} className='input-help error'>
                    {field.error}
                </p>
            )}
        </div>
    );
}
