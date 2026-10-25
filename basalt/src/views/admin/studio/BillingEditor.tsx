import { useEffect, useId, useState, type InputHTMLAttributes } from 'react';
import { Button, Spinner, Switch, http, httpErrorToHuman } from '@pterodactyl/sdk';
import { Segmented, controlClass } from './Fields';

const BILLING = '/api/admin/extensions/basalt/billing';

interface Saved {
    readonly provider: 'none' | 'paymenter' | 'whmcs';
    readonly url: string;
    readonly identifier: string;
    readonly has_key: boolean;
    readonly has_secret: boolean;
    readonly block: boolean;
    readonly alert: boolean;
}

/** The form: a key or secret typed in, or empty to keep the saved one. */
type Form = Omit<Saved, 'has_key' | 'has_secret'> & { readonly key: string; readonly secret: string };

const formOf = (saved: Saved): Form => ({
    provider: saved.provider,
    url: saved.url,
    identifier: saved.identifier,
    key: '',
    secret: '',
    block: saved.block,
    alert: saved.alert,
});

const sectionClass = 'mb-4 overflow-hidden rounded-lg border border-border bg-(--card)';
const headingClass = 'border-b border-border px-4 py-3 text-xs leading-[1.5] font-semibold tracking-[0.08em] uppercase';
const helpClass = 'text-xs leading-[1.5] text-muted-foreground';

function Text({ label, help, ...props }: { label: string; help: string } & InputHTMLAttributes<HTMLInputElement>) {
    const id = useId();
    return (
        <div className='grid gap-1.5'>
            <label htmlFor={id} className='caption'>
                {label}
            </label>
            <input id={id} spellCheck={false} autoComplete='off' {...props} className={controlClass} />
            <p className={helpClass}>{help}</p>
        </div>
    );
}

/**
 * The billing system the servers are sold through: Paymenter or WHMCS, its address and API
 * credentials, which a test tries, and where the panel shows each server's service.
 */
export default function BillingEditor({ onSaved, flash }: { onSaved: () => void; flash: (tone: 'ok' | 'error', text: string) => void }) {
    const [saved, setSaved] = useState<Saved | null>(null);
    const [form, setForm] = useState<Form | null>(null);
    const [failed, setFailed] = useState(false);
    const [busy, setBusy] = useState<'save' | 'test' | null>(null);
    const [test, setTest] = useState<{ ok: boolean; message: string } | null>(null);

    useEffect(() => {
        http.get<{ billing: Saved }>(BILLING)
            .then(({ data }) => {
                setSaved(data.billing);
                setForm(formOf(data.billing));
            })
            .catch(() => setFailed(true));
    }, []);

    if (failed) return <p className='text-sm text-destructive'>The billing settings could not be loaded.</p>;
    if (!saved || !form) return <Spinner size='large' centered />;

    const set = (patch: Partial<Form>) => {
        setForm({ ...form, ...patch });
        setTest(null);
    };
    const dirty = JSON.stringify(form) !== JSON.stringify(formOf(saved));
    const payload = { ...form, url: form.url.trim(), identifier: form.identifier.trim() };

    const save = async () => {
        setBusy('save');
        try {
            const { data } = await http.put<{ billing: Saved }>(BILLING, payload);
            setSaved(data.billing);
            setForm(formOf(data.billing));
            flash('ok', 'Saved.');
            onSaved();
        } catch (error) {
            flash('error', httpErrorToHuman(error));
        } finally {
            setBusy(null);
        }
    };

    const tryIt = async () => {
        setBusy('test');
        try {
            setTest((await http.post<{ ok: boolean; message: string }>(`${BILLING}/test`, payload)).data);
        } catch (error) {
            setTest({ ok: false, message: httpErrorToHuman(error) });
        } finally {
            setBusy(null);
        }
    };

    return (
        <>
            <p className='mb-4 text-[13px] leading-[1.5] text-muted-foreground'>
                Shows each server's subscription from Paymenter or WHMCS: status, plan, price and next due date, with a link to manage it. Servers are matched on their
                external ID, which the Pterodactyl modules of Paymenter and WHMCS set to the service ID. Only the server owner and admins see it, never subusers.
            </p>
            <section className={sectionClass}>
                <h3 className={headingClass}>Billing system</h3>
                <div className='grid gap-4 p-4'>
                    <div className='grid gap-1.5'>
                        <span className='caption'>Provider</span>
                        <Segmented
                            label='Provider'
                            value={form.provider}
                            options={[
                                { id: 'none', label: 'None' },
                                { id: 'paymenter', label: 'Paymenter' },
                                { id: 'whmcs', label: 'WHMCS' },
                            ]}
                            onChange={(provider) => set({ provider })}
                        />
                    </div>
                    {form.provider !== 'none' && (
                        <Text
                            label='URL'
                            help='The address of your billing system, such as https://billing.example.com.'
                            type='url'
                            value={form.url}
                            maxLength={255}
                            placeholder='https://billing.example.com'
                            onChange={(event) => set({ url: event.target.value })}
                        />
                    )}
                    {form.provider === 'paymenter' && (
                        <Text
                            label='API key'
                            help={`${saved.has_key ? 'Saved. Leave empty to keep it. ' : ''}Create one in Paymenter's admin area under Other, API Keys, with the View Services, View Products and View Invoices permissions.`}
                            type='password'
                            value={form.key}
                            maxLength={500}
                            placeholder={saved.has_key ? '••••••••' : 'PAYM...'}
                            onChange={(event) => set({ key: event.target.value })}
                        />
                    )}
                    {form.provider === 'whmcs' && (
                        <>
                            <Text
                                label='API identifier'
                                help='Create API credentials under System Settings, API Credentials.'
                                value={form.identifier}
                                maxLength={255}
                                onChange={(event) => set({ identifier: event.target.value })}
                            />
                            <Text
                                label='API secret'
                                help={`${saved.has_secret ? 'Saved. Leave empty to keep it. ' : ''}Also add the IP address of this Panel under API IP Access Restriction in the WHMCS general settings.`}
                                type='password'
                                value={form.secret}
                                maxLength={500}
                                placeholder={saved.has_secret ? '••••••••' : ''}
                                onChange={(event) => set({ secret: event.target.value })}
                            />
                        </>
                    )}
                </div>
            </section>
            {form.provider !== 'none' && (
                <section className={sectionClass}>
                    <h3 className={headingClass}>Show billing</h3>
                    <div className='grid gap-4 p-4'>
                        <div className='grid gap-1.5'>
                            <Switch checked={form.block} onChange={() => set({ block: !form.block })} label='Billing block on the server dashboard' />
                            <p className={helpClass}>Add or move the Billing block in the Server dashboard tab.</p>
                        </div>
                        <div className='grid gap-1.5'>
                            <Switch checked={form.alert} onChange={() => set({ alert: !form.alert })} label='Alert for unpaid invoices' />
                            <p className={helpClass}>Shown on every page of a server that has an unpaid invoice, with a button to pay it.</p>
                        </div>
                    </div>
                </section>
            )}
            {test && (
                <p role='status' className={test.ok ? 'mt-3 text-[13px] leading-[1.5] text-success' : 'mt-3 text-[13px] leading-[1.5] text-destructive'}>
                    {test.message}
                </p>
            )}
            <div className='flex flex-wrap justify-end gap-2'>
                <span className='mr-auto'>
                    {form.provider !== 'none' && (
                        <Button.Text size='xsmall' isSecondary disabled={busy !== null} isLoading={busy === 'test'} onClick={() => void tryIt()}>
                            Test connection
                        </Button.Text>
                    )}
                </span>
                <Button.Text size='xsmall' isSecondary disabled={!dirty || busy !== null} onClick={() => set(formOf(saved))}>
                    Undo changes
                </Button.Text>
                <Button size='xsmall' disabled={!dirty || busy !== null} isLoading={busy === 'save'} onClick={() => void save()}>
                    Save
                </Button>
            </div>
        </>
    );
}
