import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import type { AppArea } from '@pterodactyl/sdk/theme';
import { usePreferences, useServerMeta, useUpdatePreferences } from '../../lib/api';
import { daysUntil, formatDay, useBilling } from '../../lib/billing';
import { fillLink, linkValues, type Announcement, type LinkValues, type NoticeType } from '../../lib/content';
import { externalProps, useFollow } from '../../lib/links';
import { Markdown } from '../../lib/markdown';

const icons: Record<NoticeType, LucideIcon> = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleAlert };

function Notice({ item, values, onDismiss }: { item: Announcement; values: LinkValues | null; onDismiss: () => void }) {
    const follow = useFollow();
    const Icon = icons[item.type];
    const href = item.buttonUrl ? fillLink(item.buttonUrl, values) : null;

    return (
        <div className='basalt-notice basalt-announcement' data-type={item.type} data-style={item.style} role={item.type === 'danger' ? 'alert' : 'status'}>
            <Icon className='basalt-announcement-icon' size={item.style === 'minimal' ? 15 : 18} aria-hidden />
            <div className='basalt-announcement-text'>
                {item.title && <p className='basalt-announcement-title'>{item.title}</p>}
                {item.body && <Markdown className='basalt-announcement-body' text={item.body} />}
            </div>
            {href && item.buttonLabel && (
                <a href={href} {...externalProps(href)} onClick={(event) => follow(event, href)} className='basalt-notice-button basalt-announcement-button'>
                    {item.buttonLabel}
                </a>
            )}
            {item.dismissible && (
                <button type='button' aria-label='Dismiss' title='Dismiss' onClick={onDismiss} className='basalt-notice-close basalt-announcement-close'>
                    <X className='size-[15px]' aria-hidden />
                </button>
            )}
        </div>
    );
}

const dismissedKey = 'basalt.unpaid.dismissed';

function dismissedInvoices(): string[] {
    try {
        const value: unknown = JSON.parse(window.sessionStorage.getItem(dismissedKey) ?? '[]');
        return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
    } catch {
        return [];
    }
}

/**
 * On a server's pages, its unpaid invoices with a button to pay the first, while the billing
 * settings show the alert. Dismissed, it stays away for the session until another invoice is unpaid.
 */
function UnpaidInvoices({ uuid }: { uuid: string }) {
    const { settings, servers } = useBilling([uuid]);
    const [dismissed, setDismissed] = useState(dismissedInvoices);
    const unpaid = servers[uuid]?.unpaid ?? [];
    const signature = `${uuid}:${unpaid.map((invoice) => invoice.id).join(',')}`;

    if (!settings?.enabled || !settings.alert || unpaid.length === 0 || dismissed.includes(signature)) return null;

    const [first] = unpaid;
    const date = formatDay(first.due_at);
    const days = daysUntil(first.due_at);
    const overdue = days !== null && days < 0;
    const text =
        unpaid.length > 1
            ? `${unpaid.length} invoices for this server have not been paid yet.`
            : date
              ? `Invoice #${first.id} ${overdue ? 'was' : 'is'} due on ${date}.`
              : `Invoice #${first.id} has not been paid yet.`;

    return (
        <div className='basalt-announcements page-width'>
            <div className='basalt-notice basalt-announcement' data-type={overdue ? 'danger' : 'warning'} data-style='card' role='alert'>
                <CircleAlert className='basalt-announcement-icon' size={18} aria-hidden />
                <div className='basalt-announcement-text'>
                    <p className='basalt-announcement-title'>{unpaid.length > 1 ? 'Unpaid invoices' : 'Unpaid invoice'}</p>
                    <p className='basalt-announcement-body'>{text}</p>
                </div>
                <a href={first.url} target='_blank' rel='noopener noreferrer' className='basalt-notice-button basalt-announcement-button'>
                    Pay invoice
                </a>
                <button
                    type='button'
                    aria-label='Dismiss'
                    title='Dismiss'
                    onClick={() => {
                        const next = [...dismissed, signature].slice(-50);
                        try {
                            window.sessionStorage.setItem(dismissedKey, JSON.stringify(next));
                        } catch {
                            // Without storage it stays dismissed until the page reloads.
                        }
                        setDismissed(next);
                    }}
                    className='basalt-notice-close basalt-announcement-close'
                >
                    <X className='size-[15px]' aria-hidden />
                </button>
            </div>
        </div>
    );
}

/**
 * The administrator's announcements for the page, above it: those for every page or for the
 * page's kind, and on a server's pages those aimed at its node or egg. A dismissed one stays away
 * for the user on every device. The admin area shows none.
 */
export default function Announcements({ area }: { area: AppArea }) {
    const uuid = area.kind === 'server' ? area.server.attributes.uuid : null;

    return (
        <>
            <Messages area={area} />
            {uuid && <UnpaidInvoices uuid={uuid} />}
        </>
    );
}

function Messages({ area }: { area: AppArea }) {
    const preferences = usePreferences();
    const update = useUpdatePreferences();
    const server = area.kind === 'server' ? area.server : null;
    const uuid = server?.attributes.uuid;
    const meta = useServerMeta(uuid ? [uuid] : [])[uuid ?? ''];

    if (!preferences.loaded || area.kind === 'admin') return null;

    const dismissed = new Set(preferences.dismissed);
    const shown = preferences.content.announcements.filter((item) => {
        if (dismissed.has(item.id) || (item.placement !== 'everywhere' && item.placement !== area.kind)) return false;
        if (item.nodes.length === 0 && item.eggs.length === 0) return true;
        if (!meta) return false;
        return (item.nodes.length === 0 || item.nodes.includes(meta.nodeId)) && (item.eggs.length === 0 || (meta.eggId !== null && item.eggs.includes(meta.eggId)));
    });
    if (shown.length === 0) return null;

    const values = server ? linkValues(server) : null;

    return (
        <div className='basalt-announcements page-width'>
            {shown.map((item) => (
                <Notice key={item.id} item={item} values={values} onDismiss={() => update.mutate({ dismissed: [...new Set([...preferences.dismissed, item.id])] })} />
            ))}
        </div>
    );
}
