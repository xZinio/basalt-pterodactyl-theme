import { Alert } from '@pterodactyl/sdk';

/** The Basalt version the panel runs, in the style of the panel's own version notice above it. */
export function VersionNotice({ version }: { version?: string }) {
    return (
        <Alert type='success' title='Basalt is active.' className='mb-6'>
            You are running Basalt {version ?? 'from a development build'}.
        </Alert>
    );
}
