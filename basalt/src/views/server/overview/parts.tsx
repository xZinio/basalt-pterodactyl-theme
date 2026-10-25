import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Copy } from 'lucide-react';
import { CopyOnClick, cn } from '@pterodactyl/sdk';

/** A titled card of the server dashboard, with anything `aside` at the end of its header. */
export function Section({
    icon: Icon,
    title,
    aside,
    children,
    className,
}: {
    icon: LucideIcon;
    title: string;
    aside?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('surface min-w-0 overflow-hidden', className)}>
            <header className='flex items-center gap-2.5 border-b border-border px-5 py-3.5'>
                <Icon className='size-[18px] shrink-0 text-primary' aria-hidden />
                <h2 className='text-base leading-6 font-semibold text-foreground'>{title}</h2>
                {aside}
            </header>
            {children}
        </section>
    );
}

/** The rows of a section, each after the first divided by a faint line. */
export function Facts({ children }: { children: ReactNode }) {
    return <div className='px-5 py-2 [&>*+*]:border-t [&>*+*]:border-border/60'>{children}</div>;
}

export function FactRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
    return (
        <div className='flex items-center justify-between gap-4 py-2.5'>
            <span className='flex shrink-0 items-center gap-2 text-sm leading-[1.5] text-muted-foreground'>
                <Icon className='size-[15px] shrink-0' aria-hidden />
                {label}
            </span>
            <span className='flex min-w-0 items-center justify-end gap-1.5 text-right text-sm leading-[1.5] text-foreground'>{children}</span>
        </div>
    );
}

export function Chip({ children, sensitive }: { children: ReactNode; sensitive?: boolean }) {
    return (
        <code
            data-sensitive={sensitive ? '' : undefined}
            className='min-w-0 truncate rounded-sm border border-border bg-foreground/5 px-2 py-0.5 font-mono text-[13px] leading-[1.5] text-foreground'
        >
            {children}
        </code>
    );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
    return (
        <CopyOnClick text={text}>
            <button
                type='button'
                aria-label={label}
                className='inline-flex size-[26px] shrink-0 items-center justify-center rounded-[6px] border-0 bg-transparent text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground'
            >
                <Copy className='size-3.5' aria-hidden />
            </button>
        </CopyOnClick>
    );
}

export function Pill({ children }: { children: ReactNode }) {
    return <span className='rounded-full bg-primary/12 px-2 py-px text-xs leading-[1.5] whitespace-nowrap text-foreground'>{children}</span>;
}
