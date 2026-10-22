import type { ComponentType } from 'react';
import { Alert, PageContentBlock, PageHeading, cn } from '@pterodactyl/sdk';
import { Slot, View, useTheme, useThemeSettings, type ViewProps } from '@pterodactyl/sdk/theme';
import type { ThemeSettings } from '../../theme-types';
import { AccentCard, ColorModeCard, GravatarCard, InterfaceCard, LanguageCard, type CardProps } from './cards';

/** Classic's cards: full width on phones, two across on tablets, three across from `lg`. */
const placed = (index: number) =>
    cn('w-full sm:w-[calc(50%_-_1rem)] md:w-auto md:flex-1', index === 1 && 'mt-8 sm:mt-0 sm:ml-8', index === 2 && 'mt-8 md:mt-0 md:ml-8');

const AvatarCard = ({ className }: CardProps) => <View name='account.avatar' className={className} />;

function Row({ cards }: { cards: (ComponentType<CardProps> | false | null)[] }) {
    const shown = cards.filter((card): card is ComponentType<CardProps> => !!card);

    return shown.length > 0 ? (
        <div className='mb-10 flex flex-wrap lg:grid lg:grid-cols-3'>
            {shown.map((Card, index) => (
                <Card key={index} className={placed(index)} />
            ))}
        </div>
    ) : null;
}

/**
 * The account page: classic's password, email and two-step cards, then the user's preferences
 * (colour mode, language) and their profile (picture, accent, this browser's interface).
 */
export default function AccountPage({ model, className }: ViewProps<'page.account.overview'>) {
    const { schemes } = useTheme();
    const { userAccent, languagePicker, gravatar } = useThemeSettings<ThemeSettings>();

    return (
        <PageContentBlock title='Account Overview' className={className}>
            <PageHeading title='Account' description='Manage your profile, credentials, and account security.' />
            {model.twoFactorRequired && (
                <Alert title='2-Factor Required' type='danger'>
                    Your account must have two-factor authentication enabled in order to continue.
                </Alert>
            )}
            <Slot name='account.overview.before' />
            <div className={cn('mb-10 flex flex-wrap lg:grid lg:grid-cols-3', model.twoFactorRequired && 'mt-4')}>
                <View name='account.password' className={placed(0)} />
                <View name='account.email' className={placed(1)} />
                <View name='account.twoFactor' className={placed(2)} />
            </div>
            <Row cards={[schemes.length > 1 && ColorModeCard, languagePicker && LanguageCard]} />
            <Row cards={[model.userAvatarsEnabled ? AvatarCard : gravatar && GravatarCard, userAccent && AccentCard, InterfaceCard]} />
            <Slot name='account.overview.after' />
        </PageContentBlock>
    );
}
