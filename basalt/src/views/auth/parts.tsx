import { useId, type ReactNode } from 'react';
import { Form, Input, Label, type FieldModel } from '@pterodactyl/sdk';
import { useThemeSettings } from '@pterodactyl/sdk/theme';
import { isExternal, parseLinks } from '../../lib/links';
import type { ThemeSettings } from '../../theme-types';

export const authLinkClass =
    'text-xs leading-[1.5] tracking-[0.06em] uppercase text-muted-foreground no-underline transition-colors hover:text-foreground';

/** A sign-in form: its title, its fields and buttons, then the row of links under it. */
export function AuthForm({ title, submit, links, children }: { title: string; submit: () => void; links: ReactNode; children: ReactNode }) {
    const { loginLinks } = useThemeSettings<ThemeSettings>();

    return (
        <Form form={{ handleSubmit: submit }} className='flex flex-col gap-5'>
            <h1 className='mb-1 text-center text-2xl leading-9 font-semibold text-foreground'>{title}</h1>
            {children}
            <div className='flex flex-wrap items-center justify-center gap-4'>
                {links}
                {parseLinks(loginLinks).map((link) => (
                    <a
                        key={link.url + link.label}
                        href={link.url}
                        className={authLinkClass}
                        {...(isExternal(link.url) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                        {link.label}
                    </a>
                ))}
            </div>
        </Form>
    );
}

/** Label, input and help text for an engine field; the field's own props pass through untouched. */
export function TextField({
    field,
    label,
    description,
    autoFocus,
}: {
    field: FieldModel;
    label: string;
    description?: string;
    autoFocus?: boolean;
}) {
    const id = useId();
    const helpId = `${id}-help`;
    const help = field.error ?? description;

    return (
        <div>
            <Label htmlFor={id}>{label}</Label>
            <Input
                {...field.fieldProps}
                id={id}
                autoFocus={autoFocus}
                aria-invalid={field.error ? true : undefined}
                aria-describedby={help ? helpId : undefined}
                $hasError={!!field.error}
            />
            {help && (
                <p id={helpId} className={field.error ? 'input-help error' : 'input-help'}>
                    {help}
                </p>
            )}
        </div>
    );
}
