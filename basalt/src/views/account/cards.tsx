import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Check, Monitor, Moon, Pipette, Sun } from 'lucide-react';
import { Button, ContentBox, Label, LinkButton, Select, Switch, cn, useCurrentUser } from '@pterodactyl/sdk';
import { useTheme, useThemeSettings } from '@pterodactyl/sdk/theme';
import UserAvatar from '../../components/UserAvatar';
import { accentPresets, applyAccent } from '../../lib/accent';
import { useLanguages, usePreferences, useUpdateLanguage, useUpdatePreferences } from '../../lib/api';
import { usePrivacy } from '../../lib/privacy';
import type { ThemeSettings } from '../../theme-types';
import { useShortcutsEnabled } from '../shell/Shortcuts';

export interface CardProps {
    className?: string;
}

const modes = [
    ['system', 'System', Monitor],
    ['light', 'Light', Sun],
    ['dark', 'Dark', Moon],
] as const;

/** System, light or dark: what the user prefers, which the panel keeps in a cookie. */
export function ColorModeCard({ className }: CardProps) {
    const { preference, setScheme } = useTheme();
    const id = useId();

    return (
        <ContentBox title='Color mode' className={className}>
            <Label id={id}>Color mode</Label>
            <div role='radiogroup' aria-labelledby={id} className='flex gap-1 rounded-md border border-border bg-input p-1'>
                {modes.map(([value, label, Icon]) => (
                    <button
                        key={value}
                        type='button'
                        role='radio'
                        aria-checked={preference === value}
                        onClick={() => setScheme(value)}
                        className={cn(
                            'flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[6px] border-0 p-2.5 text-sm leading-[1.5] transition-colors',
                            preference === value
                                ? 'bg-popover text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.25)]'
                                : 'bg-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Icon className='size-3.5 shrink-0' aria-hidden />
                        <span className='truncate'>{label}</span>
                    </button>
                ))}
            </div>
            <p className='input-help'>System follows the light or dark setting of your device.</p>
        </ContentBox>
    );
}

/** The language the panel is shown in, among those installed on it. */
export function LanguageCard({ className }: CardProps) {
    const languages = useLanguages();
    const update = useUpdateLanguage();
    const [choice, setChoice] = useState<string | null>(null);
    const id = useId();

    const current = languages?.language ?? 'en';
    const value = choice ?? current;
    const options = Object.entries(languages?.languages ?? { en: 'English' }).map(([code, name]) => ({ value: code, label: name }));

    return (
        <ContentBox title='Language' className={className}>
            <Label htmlFor={id}>Language</Label>
            <Select id={id} value={value} options={options} onChange={(next) => setChoice(String(next))} disabled={!languages} />
            <p className='input-help'>The panel is shown in this language.</p>
            <div className='mt-6'>
                <Button
                    disabled={!languages || value === current}
                    isLoading={update.isPending}
                    onClick={() => update.mutate(value, { onSuccess: () => setChoice(null) })}
                >
                    Update language
                </Button>
            </div>
        </ContentBox>
    );
}

/** The picture beside the user's name, and what the card says about where it comes from. */
export function PictureRow({ picture, children }: { picture: ReactNode; children: ReactNode }) {
    return (
        <div className='flex items-center gap-4'>
            <span className='size-16 shrink-0 overflow-hidden rounded-full bg-popover'>{picture}</span>
            <p className='input-help m-0'>{children}</p>
        </div>
    );
}

/** Without picture uploads on the panel, a user's picture is their Gravatar, changed on Gravatar itself. */
export function GravatarCard({ className }: CardProps) {
    const user = useCurrentUser();

    return (
        <ContentBox title='Profile picture' className={className}>
            <PictureRow picture={<UserAvatar user={user} size={64} />}>
                Your Gravatar is shown as your picture. Change it at gravatar.com.
            </PictureRow>
            <div className='mt-6 flex flex-wrap gap-3'>
                <LinkButton href='https://gravatar.com/profile' target='_blank' rel='noopener noreferrer'>
                    Change on Gravatar
                </LinkButton>
            </div>
        </ContentBox>
    );
}

function Swatch({ color, selected, label, onSelect }: { color: string; selected: boolean; label: string; onSelect: () => void }) {
    return (
        <button
            type='button'
            role='radio'
            aria-checked={selected}
            aria-label={label}
            title={label}
            onClick={onSelect}
            style={{ backgroundColor: color }}
            className={cn(
                'flex size-8 cursor-pointer items-center justify-center rounded-full border-2 text-white shadow-[inset_0_0_0_1px_rgb(0_0_0/0.2)] transition-transform hover:scale-105',
                selected ? 'border-foreground' : 'border-transparent'
            )}
        >
            {selected && <Check className='size-3.5' strokeWidth={3} aria-hidden />}
        </button>
    );
}

/** A personal accent: the panel's own, a preset, or any colour; it changes the panel only for this user. */
export function AccentCard({ className }: CardProps) {
    const { accent: panelAccent } = useThemeSettings<ThemeSettings>();
    const { accent } = usePreferences();
    const update = useUpdatePreferences();
    const [custom, setCustom] = useState<string | null>(null);
    const save = useRef<ReturnType<typeof setTimeout>>(undefined);
    const id = useId();

    useEffect(() => () => clearTimeout(save.current), []);

    const choose = (color: string | null) => {
        clearTimeout(save.current);
        setCustom(null);
        applyAccent(color);
        update.mutate({ accent: color });
    };
    // The picker reports every colour it passes through; paint each, and save the one it settles on.
    const drag = (color: string) => {
        setCustom(color);
        applyAccent(color);
        clearTimeout(save.current);
        save.current = setTimeout(() => update.mutate({ accent: color }), 500);
    };

    const chosen = custom ?? accent;
    const isCustom = chosen !== null && !(accentPresets as readonly string[]).includes(chosen.toLowerCase());

    return (
        <ContentBox title='Accent color' className={className}>
            <Label id={id}>Accent color</Label>
            <div role='radiogroup' aria-labelledby={id} className='mt-1 flex flex-wrap gap-2'>
                <Swatch color={panelAccent} label='The panel’s accent' selected={chosen === null} onSelect={() => choose(null)} />
                {accentPresets.map((color) => (
                    <Swatch key={color} color={color} label={color} selected={chosen?.toLowerCase() === color} onSelect={() => choose(color)} />
                ))}
                <label
                    title='Any colour'
                    style={isCustom ? { backgroundColor: chosen } : undefined}
                    className={cn(
                        'relative flex size-8 cursor-pointer items-center justify-center rounded-full border-2 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.2)]',
                        isCustom ? 'border-foreground text-white' : 'border-border bg-popover text-muted-foreground hover:text-foreground'
                    )}
                >
                    {isCustom ? <Check className='size-3.5' strokeWidth={3} aria-hidden /> : <Pipette className='size-3.5' aria-hidden />}
                    <input
                        type='color'
                        aria-label='Any colour'
                        value={chosen ?? panelAccent}
                        onChange={(event) => drag(event.target.value)}
                        className='absolute inset-0 size-full cursor-pointer opacity-0'
                    />
                </label>
            </div>
            <p className='input-help'>Only changes the panel for you.</p>
        </ContentBox>
    );
}

function Toggle({ label, help, checked, onChange, className }: { label: string; help: string; checked: boolean; onChange: (checked: boolean) => void; className?: string }) {
    const id = useId();

    return (
        <div className={className}>
            <div className='flex items-center gap-4'>
                <div className='min-w-0 flex-1'>
                    <Label htmlFor={id} className='mb-0'>
                        {label}
                    </Label>
                </div>
                <Switch id={id} checked={checked} onChange={onChange} />
            </div>
            <p className='input-help'>{help}</p>
        </div>
    );
}

/** This browser's conveniences: blurring sensitive details, and the keyboard shortcuts. */
export function InterfaceCard({ className }: CardProps) {
    const [privacy, setPrivacy] = usePrivacy();
    const [shortcuts, setShortcuts] = useShortcutsEnabled();

    return (
        <ContentBox title='Interface' className={className}>
            <Toggle
                label='Privacy mode'
                help='Blurs IP addresses and email addresses until you hover them. Handy while streaming.'
                checked={privacy}
                onChange={setPrivacy}
            />
            <Toggle className='mt-5' label='Keyboard shortcuts' help='Press ? anywhere to see all shortcuts.' checked={shortcuts} onChange={setShortcuts} />
        </ContentBox>
    );
}
