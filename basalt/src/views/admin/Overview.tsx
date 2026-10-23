import { Alert } from '@pterodactyl/sdk';
import { useBasaltVersion } from '../../lib/api';

/**
 * Which Basalt the panel runs, in the style of the panel's own version notice: up to date or
 * behind once GitHub names a release, and only the version until then.
 */
export default function VersionNotice() {
    const version = useBasaltVersion();

    if (!version) return null;

    if (version.is_latest === false) {
        return (
            <Alert type='warning' title='A Basalt update is available.' className='basalt-version mb-6'>
                You are running Basalt {version.current}; the latest is{' '}
                <a
                    href='https://github.com/xZinio/basalt-pterodactyl-theme/releases/latest'
                    target='_blank'
                    rel='noreferrer'
                    className='underline transition-colors hover:text-accent'
                >
                    {version.latest}
                </a>
                .
            </Alert>
        );
    }

    return (
        <Alert type='success' title={version.is_latest ? 'Basalt is up-to-date.' : 'Basalt is active.'} className='basalt-version mb-6'>
            You are running Basalt {version.current}.
        </Alert>
    );
}
