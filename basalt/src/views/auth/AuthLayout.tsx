import type { ReactNode } from 'react';
import { Main, cn, useThemeSettings, type ViewProps } from '@pterodactyl/sdk/theme';
import type { ThemeSettings } from '../../theme-types';

/** The sign-in layouts with a banner, which holds the background image and the logo. */
export const bannerLayouts: readonly string[] = ['banner', 'floating', 'panels'];

type Brand = { readonly name: string; readonly logoUrl: string | null };

/** The sign-in logo: the Logo setting of the sign-in page, then the panel's, or else the panel's name. */
export function AuthLogo({ brand }: { brand: Brand }) {
    const { loginLogo } = useThemeSettings<ThemeSettings>();
    const logo = loginLogo ?? brand.logoUrl;

    return <div className='basalt-auth-logo'>{logo ? <img src={logo} alt={brand.name} /> : <span>{brand.name}</span>}</div>;
}

/**
 * The page around the sign-in card, for the layout and for the studio's preview of it: the
 * background image where no banner holds it, and the logo above the card where the Logo position
 * setting puts it. The card, its banner and the copyright line are the page's own.
 */
export function AuthPage({ brand, className, children }: { brand: Brand; className?: string; children: ReactNode }) {
    const { loginLayout, loginImage, logoPosition } = useThemeSettings<ThemeSettings>();
    const banner = bannerLayouts.includes(loginLayout);

    return (
        <div className={cn('basalt-auth', className)} data-background={!banner && loginImage ? '' : undefined}>
            {!banner && logoPosition === 'header' && <AuthLogo brand={brand} />}
            <Main className='flex w-full flex-col items-center'>{children}</Main>
        </div>
    );
}

/** The sign-in screens. It renders before any lazy chunk, so it imports nothing from the full SDK. */
export default function AuthLayout({ model, className, children }: ViewProps<'layout.auth'>) {
    return (
        <AuthPage brand={model.brand} className={className}>
            {children}
        </AuthPage>
    );
}
