import { useId, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@pterodactyl/sdk';

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
    'w-full min-w-0 rounded-(--basalt-control-radius) border border-input-border bg-input text-sm tracking-normal text-foreground outline-hidden transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-ring/50';

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
                className={cn(controlClass, 'py-2 pr-3 pl-9 leading-[1.5] placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden')}
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
        <select id={id} value={value} onChange={(event) => onChange(event.target.value as T)} className={cn(controlClass, 'h-10 cursor-pointer px-3 py-2')}>
            {(Object.entries(options) as [T, string][]).map(([option, label]) => (
                <option key={option} value={option}>
                    {label}
                </option>
            ))}
        </select>
    );
}
