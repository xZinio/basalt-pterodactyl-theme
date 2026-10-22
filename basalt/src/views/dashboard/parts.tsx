import { useId, type ReactNode } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@pterodactyl/sdk';
import { useThemeSettings } from '@pterodactyl/sdk/theme';
import { useLocalState } from '../../lib/local';
import { externalProps } from '../../lib/links';
import type { ThemeSettings } from '../../theme-types';

/** `**bold**` in a setting's text, and nothing else: the rest is shown as written. */
export function Rich({ text }: { text: string }) {
    return (
        <>
            {text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
                part.startsWith('**') && part.endsWith('**') ? (
                    <strong key={index} className='font-semibold'>
                        {part.slice(2, -2)}
                    </strong>
                ) : (
                    part
                )
            )}
        </>
    );
}

/** The administrator's announcement, until the user dismisses that text. */
export function Announcement() {
    const { announcement, announcementTitle, announcementButton } = useThemeSettings<ThemeSettings>();
    const [dismissed, setDismissed] = useLocalState<string | null>('basalt.announcement.dismissed', null);
    const body = announcement.trim();
    const title = announcementTitle.trim();
    const signature = `${title}\n${body}`;

    if ((!body && !title) || dismissed === signature) return null;

    const [buttonLabel, buttonUrl] = announcementButton.split('|').map((part) => part.trim());
    const button = buttonLabel && buttonUrl && /^(https?:\/\/|\/(?!\/))/i.test(buttonUrl);

    return (
        <div className='surface accent-bar flex flex-col gap-3 py-5 pr-5 pl-8 [--bar-inset:1rem] sm:flex-row sm:items-center'>
            <div className='min-w-0 flex-1 text-sm leading-[1.375]'>
                {title && <p className='text-[15px] font-semibold text-foreground'>{title}</p>}
                {body && (
                    <p className='text-foreground'>
                        <Rich text={body} />
                    </p>
                )}
            </div>
            {button && (
                <a
                    href={buttonUrl}
                    {...externalProps(buttonUrl)}
                    className='self-start rounded-md border border-primary/55 bg-primary/20 px-3 py-1.5 text-[13px] leading-[1.5] font-semibold whitespace-nowrap text-foreground no-underline transition-colors hover:bg-primary/30 sm:self-auto'
                >
                    {buttonLabel}
                </a>
            )}
            <button
                type='button'
                onClick={() => setDismissed(signature)}
                aria-label='Dismiss'
                className='absolute top-4 right-4 inline-flex size-7 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:text-foreground sm:static'
            >
                <X className='size-[15px]' aria-hidden />
            </button>
        </div>
    );
}

export function Welcome({ name }: { name: string }) {
    return (
        <div className='surface accent-bar py-6 pr-6 pl-9 [--bar-inset:1.25rem]'>
            <h2 className='pl-3 text-[28px] leading-[1.2] font-semibold text-foreground'>Welcome back, {name}</h2>
        </div>
    );
}

/** A caption above a control. */
export function Field({ label, className, children }: { label: string; className?: string; children: (id: string) => ReactNode }) {
    const id = useId();
    return (
        <div className={cn('flex min-w-0 flex-col gap-1', className)}>
            <label htmlFor={id} className='caption'>
                {label}
            </label>
            {children(id)}
        </div>
    );
}

const controlClass =
    'h-10 w-full min-w-0 rounded-md border border-border bg-popover text-sm text-foreground outline-hidden transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-ring/50';

export function SearchInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (value: string) => void; placeholder: string }) {
    return (
        <span className='relative block'>
            <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' aria-hidden />
            <input
                id={id}
                type='search'
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                autoComplete='off'
                className={cn(controlClass, 'py-2 pr-3 pl-9 placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden')}
            />
        </span>
    );
}

export function NativeSelect<T extends string>({
    id,
    value,
    onChange,
    options,
}: {
    id: string;
    value: T;
    onChange: (value: T) => void;
    options: Record<T, string>;
}) {
    return (
        <span className='relative block'>
            <select
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value as T)}
                className={cn(controlClass, 'cursor-pointer appearance-none bg-none py-2 pr-8 pl-3')}
            >
                {(Object.entries(options) as [T, string][]).map(([option, label]) => (
                    <option key={option} value={option}>
                        {label}
                    </option>
                ))}
            </select>
            <ChevronDown className='pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-foreground' aria-hidden />
        </span>
    );
}
