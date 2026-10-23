import { Main, cn, useThemeSettings, type ViewProps } from '@pterodactyl/sdk/theme';
import BrandMark from '../../components/BrandMark';
import type { ThemeSettings } from '../../theme-types';

/**
 * The sign-in screens: one card, a picture banner on the left (on top on phones) and the page's
 * form on the right, centred with the copyright line under it. It renders before any lazy chunk,
 * so it imports nothing from the full SDK.
 */
export default function AuthLayout({ model, className, children }: ViewProps<'layout.auth'>) {
    const { loginTagline } = useThemeSettings<ThemeSettings>();
    const { brand } = model;

    return (
        <div className={cn('flex min-h-dvh flex-col justify-center px-4 py-8', className)}>
            <Main className='mx-auto w-full max-w-auth'>
                {/* The card fill by its token: theme.css gives `.bg-card` the lighter card shadow. */}
                <div className='flex flex-col overflow-hidden rounded-[15px] border border-border/70 bg-(--card) shadow-overlay md:flex-row'>
                    <div className='auth-banner flex min-h-48 flex-col gap-2 p-8 text-white md:w-1/2 in-data-[basalt-login-layout=simple]:hidden'>
                        {brand.logoUrl ? (
                            <img src={brand.logoUrl} alt='' className='mb-auto size-10 object-contain' />
                        ) : (
                            <BrandMark className='mb-auto size-10' />
                        )}
                        <strong className='block text-[28px] leading-[1.2] font-semibold text-white'>{brand.name}</strong>
                        {loginTagline && <span className='block text-sm text-white opacity-85'>{loginTagline}</span>}
                    </div>
                    <div className='min-w-0 flex-1 p-8'>{children}</div>
                </div>
                <p className='mt-6 text-center text-xs text-muted-foreground'>
                    &copy; 2015 - <span suppressHydrationWarning>{new Date().getFullYear()}</span>{' '}
                    <a
                        href='https://pterodactyl.io'
                        target='_blank'
                        rel='noopener nofollow noreferrer'
                        className='text-muted-foreground no-underline hover:text-foreground'
                    >
                        Pterodactyl Software
                    </a>
                </p>
            </Main>
        </div>
    );
}
