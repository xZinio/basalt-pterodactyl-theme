import { expect, test } from 'vitest';
import { daysUntil, dueLabel, formatPrice, isFree, statusLabel, statusTone, type Billing } from './billing';

const service = (fields: Partial<Billing>): Billing => ({
    status: 'active',
    plan: null,
    price: '14.99',
    currency: null,
    prefix: null,
    suffix: null,
    cycle: 'month',
    due_at: null,
    url: 'https://billing.example.com',
    upgrade_url: null,
    unpaid: [],
    ...fields,
});

test('writes the price with the system\'s own prefix and suffix, or the currency\'s symbol', () => {
    expect(formatPrice(service({ prefix: '$', suffix: ' USD', currency: 'USD' }), 'en-US')).toBe('$14.99 USD');
    expect(formatPrice(service({ currency: 'EUR' }), 'en-US')).toBe('€14.99');
    expect(formatPrice(service({ currency: 'EURO' }), 'en-US')).toBe('14.99 EURO');
    expect(formatPrice(service({ price: null }))).toBeNull();
    expect(isFree(service({ price: '0.00' }))).toBe(true);
});

test('counts the days to the due date', () => {
    const now = new Date(2026, 9, 25, 18, 30);
    expect(daysUntil('2026-10-30', now)).toBe(5);
    expect(daysUntil('2026-10-25', now)).toBe(0);
    expect(daysUntil('2026-10-23', now)).toBe(-2);
    expect(daysUntil(null, now)).toBeNull();
    expect([5, 1, 0, -1, -2].map(dueLabel)).toEqual(['Due in 5 days', 'Due tomorrow', 'Due today', 'Overdue by 1 day', 'Overdue by 2 days']);
});

test('names and tones the service\'s status', () => {
    expect([statusLabel('active'), statusTone('active')]).toEqual(['Active', 'success']);
    expect([statusLabel('pending'), statusTone('pending')]).toEqual(['Pending', 'warning']);
    expect(statusTone('terminated')).toBe('danger');
    expect([statusLabel('on-hold'), statusTone('on-hold')]).toEqual(['On-hold', 'neutral']);
});
