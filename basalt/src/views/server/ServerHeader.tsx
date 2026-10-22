import { cn } from '@pterodactyl/sdk';
import { View } from '@pterodactyl/sdk/theme';

/** The top of a server's main pages: its name and description, with the power buttons beside them. */
export default function ServerHeader({
    name,
    description,
    power = true,
    className,
}: {
    name: string;
    description: string | null;
    power?: boolean;
    className?: string;
}) {
    return (
        <div className={cn('mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
            <div className='min-w-0'>
                <h1 className='line-clamp-1 font-header text-2xl leading-relaxed font-medium text-foreground'>{name}</h1>
                {description && <p className='line-clamp-2 text-sm text-muted-foreground'>{description}</p>}
            </div>
            {power && <View name='server.power' className='shrink-0' />}
        </div>
    );
}
