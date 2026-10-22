import { useRef } from 'react';
import { Button, ContentBox, SpinnerOverlay, useCurrentUser } from '@pterodactyl/sdk';
import { useThemeSettings, type ViewProps } from '@pterodactyl/sdk/theme';
import UserAvatar from '../../components/UserAvatar';
import type { ThemeSettings } from '../../theme-types';
import { PictureRow } from './cards';

/** The user's uploaded picture, where the panel allows uploads: pick one, save it, or remove it. */
export default function Avatar({ model, className }: ViewProps<'account.avatar'>) {
    const input = useRef<HTMLInputElement>(null);
    const user = useCurrentUser();
    const { gravatar } = useThemeSettings<ThemeSettings>();

    const picture = model.preview ? (
        <img src={model.preview} alt='' className='size-full object-cover' />
    ) : (
        <UserAvatar user={{ ...user, avatar: null }} size={64} />
    );
    const note = model.selected
        ? 'Save it to show this picture beside your name.'
        : model.avatar
          ? 'Your picture is shown beside your name across the panel.'
          : gravatar
            ? 'Your Gravatar is shown until you upload a picture.'
            : 'Upload a picture to show beside your name.';

    return (
        <ContentBox title='Profile picture' className={className}>
            <SpinnerOverlay size='large' visible={model.submitting} />
            <PictureRow picture={picture}>{note}</PictureRow>
            <input
                ref={input}
                type='file'
                accept={model.accept}
                className='hidden'
                aria-label='Profile picture file'
                onChange={(event) => model.select(event.target.files?.[0] ?? null)}
            />
            <div className='mt-6 flex flex-wrap gap-3'>
                <Button onClick={() => (model.selected ? model.submit() : input.current?.click())} disabled={model.selected ? !model.canSubmit : false}>
                    {model.selected ? 'Save picture' : 'Upload picture'}
                </Button>
                {model.selected ? (
                    <Button.Text onClick={() => model.select(null)}>Cancel</Button.Text>
                ) : (
                    model.avatar && <Button.Danger onClick={model.remove}>Remove picture</Button.Danger>
                )}
            </div>
        </ContentBox>
    );
}
