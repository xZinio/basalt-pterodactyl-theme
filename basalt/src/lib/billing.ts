import { useQuery } from '@tanstack/react-query';
import { http } from '@pterodactyl/sdk';

/** A server's service in the billing system, as its owner sees it. */
export interface Billing {
    readonly status: string;
    readonly plan: string | null;
    readonly price: string | null;
    readonly currency: string | null;
    readonly prefix: string | null;
    readonly suffix: string | null;
    /** "month", "year", "3 months" and the like; null for a one-time or free service. */
    readonly cycle: string | null;
    /** The next due date, YYYY-MM-DD. */
    readonly due_at: string | null;
    /** Where its owner manages it. */
    readonly url: string;
    readonly upgrade_url: string | null;
    readonly unpaid: readonly { readonly id: string; readonly url: string; readonly due_at: string | null }[];
}

export interface BillingSettings {
    readonly enabled: boolean;
    /** The Billing block shows on the server dashboard. */
    readonly block: boolean;
    /** Servers with an unpaid invoice show an alert on their pages. */
    readonly alert: boolean;
}

interface Answer {
    readonly settings: BillingSettings;
    readonly servers: Readonly<Record<string, Billing | null>>;
}

/** The services of the given servers the user owns, read again every five minutes. */
export function useBilling(uuids: readonly string[]): { settings: BillingSettings | null; servers: Readonly<Record<string, Billing | null>> } {
    const key = [...uuids].sort();
    const { data } = useQuery({
        queryKey: ['basalt', 'billing', key],
        queryFn: async () => (await http.get<Answer>('/api/client/extensions/basalt/billing', { params: { uuids: key } })).data,
        enabled: key.length > 0,
        staleTime: 5 * 60_000,
    });

    return { settings: data?.settings ?? null, servers: data?.servers ?? {} };
}

export const isFree = (billing: Billing): boolean => billing.price !== null && Number(billing.price) === 0;

/** The price in the system's currency: its own prefix and suffix, or the currency's symbol. */
export function formatPrice(billing: Billing, locale?: string): string | null {
    if (billing.price === null) return null;
    const amount = Number(billing.price);
    if (billing.currency && !billing.prefix && !billing.suffix) {
        try {
            return new Intl.NumberFormat(locale, { style: 'currency', currency: billing.currency }).format(amount);
        } catch {
            return `${billing.price} ${billing.currency}`;
        }
    }
    return `${billing.prefix ?? ''}${billing.price}${billing.suffix ?? (billing.currency && !billing.prefix ? ` ${billing.currency}` : '')}`;
}

function day(value: string | null): Date | null {
    const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

/** Days from today to a date: negative once it has passed. */
export function daysUntil(value: string | null, now = new Date()): number | null {
    const date = day(value);
    if (!date) return null;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

export function formatDay(value: string | null, locale?: string): string | null {
    const date = day(value);
    return date ? new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date) : null;
}

export function dueLabel(days: number): string {
    if (days < 0) return days === -1 ? 'Overdue by 1 day' : `Overdue by ${-days} days`;
    if (days === 0) return 'Due today';
    return days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
}

const statuses: Readonly<Record<string, string>> = {
    active: 'Active',
    pending: 'Pending',
    suspended: 'Suspended',
    cancelled: 'Cancelled',
    terminated: 'Terminated',
    completed: 'Completed',
    fraud: 'Fraud',
};

export const statusLabel = (status: string): string => statuses[status] ?? status.charAt(0).toUpperCase() + status.slice(1);

export const statusTone = (status: string): 'success' | 'warning' | 'danger' | 'neutral' =>
    status === 'active' ? 'success' : status === 'pending' ? 'warning' : ['suspended', 'cancelled', 'terminated', 'fraud'].includes(status) ? 'danger' : 'neutral';
