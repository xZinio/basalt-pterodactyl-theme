import { useId, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Upload, X } from 'lucide-react';
import { Button, Switch, cn, http, httpErrorToHuman, toast } from '@pterodactyl/sdk';
import { SETTINGS_URL, fullHex, isHex, type Setting, type SettingList, type SettingValue } from './model';

/** The studio's text controls: a compact field on the input surface. */
export const controlClass =
    'w-full min-w-0 rounded-(--basalt-control-radius) border border-input-border bg-input px-3 py-2 text-sm leading-[1.5] font-normal tracking-normal text-foreground normal-case focus:outline-2 focus:outline-offset-1 focus:outline-ring aria-invalid:border-destructive';

/** A few choices side by side in a well, the chosen one raised. */
export function Segmented<T extends string>({
    value,
    options,
    onChange,
    label,
    labelledBy,
}: {
    value: T | SettingValue;
    options: readonly { readonly id: T; readonly label: string; readonly icon?: LucideIcon; readonly disabled?: boolean }[];
    onChange: (value: T) => void;
    label?: string;
    labelledBy?: string;
}) {
    return (
        <div role='group' aria-label={label} aria-labelledby={labelledBy} className='inline-flex flex-wrap gap-1 rounded-(--basalt-control-radius) border border-input-border bg-input p-1'>
            {options.map((option) => (
                <button
                    key={option.id}
                    type='button'
                    aria-pressed={value === option.id}
                    disabled={option.disabled}
                    onClick={() => onChange(option.id)}
                    className={cn(
                        'inline-flex flex-1 basis-0 cursor-pointer items-center justify-center gap-1.5 rounded-[calc(var(--basalt-control-radius)*0.75)] border-0 px-2.5 py-1.5 text-[13px] leading-[1.5] whitespace-nowrap transition-colors disabled:cursor-default disabled:opacity-50',
                        value === option.id
                            ? 'bg-popover text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.25)]'
                            : 'bg-transparent text-muted-foreground hover:not-disabled:text-foreground'
                    )}
                >
                    {option.icon && <option.icon className='size-3.5' aria-hidden />}
                    {option.label}
                </button>
            ))}
        </div>
    );
}

/** A swatch that opens the system picker, beside the colour as hex. */
function ColorControl({ id, label, value, onChange }: { id: string; label: string; value: SettingValue; onChange: (value: string) => void }) {
    const color = typeof value === 'string' && isHex(value) ? fullHex(value) : '#000000';
    // What is typed, until the field is left: a half-typed colour changes nothing.
    const [typed, setTyped] = useState<string | null>(null);

    return (
        <div className='grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2'>
            <label className='relative h-[2.375rem] cursor-pointer overflow-hidden rounded-(--basalt-control-radius) border border-border' style={{ backgroundColor: color }}>
                <input
                    type='color'
                    value={color}
                    onChange={(event) => onChange(event.target.value)}
                    aria-label={`Pick the ${label.toLowerCase()}`}
                    className='absolute inset-0 size-full cursor-pointer opacity-0'
                />
            </label>
            <input
                id={id}
                value={typed ?? color}
                spellCheck={false}
                aria-invalid={typed !== null && !isHex(typed) ? true : undefined}
                onChange={(event) => {
                    setTyped(event.target.value);
                    if (isHex(event.target.value)) onChange(fullHex(event.target.value));
                }}
                onBlur={() => setTyped(null)}
                className={controlClass}
            />
        </div>
    );
}

/** An image setting: the panel stores it as soon as it is uploaded or removed, outside the draft. */
function ImageControl({ setting, value, onSaved }: { setting: Setting; value: SettingValue; onSaved: (settings: Setting[]) => void }) {
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const url = `${SETTINGS_URL}/${setting.key}/image`;

    const send = async (request: () => Promise<{ data: SettingList }>) => {
        setBusy(true);
        try {
            onSaved((await request()).data.data.map((item) => item.attributes));
        } catch (error) {
            toast.error(httpErrorToHuman(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className='grid gap-2'>
            <div className='flex h-20 items-center justify-center overflow-hidden rounded-(--basalt-control-radius) border border-dashed border-border bg-input text-xs leading-[1.5] text-muted-foreground'>
                {typeof value === 'string' ? <img src={value} alt='' className='max-h-full max-w-full object-contain' /> : 'None'}
            </div>
            <div className='flex flex-wrap gap-2'>
                <Button.Text size='xsmall' disabled={busy} onClick={() => input.current?.click()}>
                    <Upload className='size-3.5' aria-hidden />
                    Upload
                </Button.Text>
                {value !== null && (
                    <Button.Text size='xsmall' isSecondary disabled={busy} onClick={() => send(() => http.delete<SettingList>(url))}>
                        <X className='size-3.5' aria-hidden />
                        Remove
                    </Button.Text>
                )}
            </div>
            <input
                ref={input}
                type='file'
                accept={setting.accept.join(',') || 'image/*'}
                aria-label={setting.label}
                className='hidden'
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) return;
                    const body = new FormData();
                    body.append('file', file);
                    void send(() => http.post<SettingList>(url, body));
                }}
            />
        </div>
    );
}

/** One setting: its caption, its control and its help. */
export function Field({
    setting,
    value,
    onChange,
    onSaved,
}: {
    setting: Setting;
    value: SettingValue;
    onChange: (value: SettingValue) => void;
    onSaved: (settings: Setting[]) => void;
}) {
    const id = useId();
    const help = setting.type === 'image' ? [setting.help, 'Saved as soon as it is uploaded or removed.'].filter(Boolean).join(' ') : setting.help;

    if (setting.type === 'toggle') {
        return <Switch checked={value === true} onChange={onChange} label={setting.label} description={help ?? undefined} />;
    }

    return (
        <div className='grid gap-1.5'>
            <label id={`${id}-label`} htmlFor={id} className='caption'>
                {setting.label}
            </label>
            {setting.type === 'color' && <ColorControl id={id} label={setting.label} value={value} onChange={onChange} />}
            {setting.type === 'image' && <ImageControl setting={setting} value={value} onSaved={onSaved} />}
            {setting.type === 'select' &&
                (setting.options.length <= 3 ? (
                    <Segmented
                        value={value}
                        options={setting.options.map((option) => ({ id: option.value, label: option.label }))}
                        onChange={onChange}
                        labelledBy={`${id}-label`}
                    />
                ) : (
                    <select id={id} value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} className={controlClass}>
                        {setting.options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                ))}
            {setting.type === 'number' &&
                (setting.min !== null && setting.max !== null ? (
                    <div className='grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-3'>
                        <input
                            id={id}
                            type='range'
                            value={typeof value === 'number' ? value : (setting.min ?? 0)}
                            min={setting.min}
                            max={setting.max}
                            step={setting.step ?? undefined}
                            onChange={(event) => onChange(event.target.valueAsNumber)}
                            className='w-full min-w-0 accent-(--primary)'
                        />
                        <span className='text-right text-[13px] leading-[1.5] text-foreground tabular-nums'>
                            {typeof value === 'number' ? value : '–'}
                            {setting.unit}
                        </span>
                    </div>
                ) : (
                    <input
                        id={id}
                        type='number'
                        value={typeof value === 'number' ? value : ''}
                        step={setting.step ?? undefined}
                        onChange={(event) => onChange(event.target.value === '' ? null : event.target.valueAsNumber)}
                        className={controlClass}
                    />
                ))}
            {setting.type === 'text' && (
                <input
                    id={id}
                    value={String(value ?? '')}
                    maxLength={setting.max_length ?? undefined}
                    onChange={(event) => onChange(event.target.value)}
                    className={controlClass}
                />
            )}
            {help && <p className='text-xs leading-[1.5] text-muted-foreground'>{help}</p>}
        </div>
    );
}
