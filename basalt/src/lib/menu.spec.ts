import { describe, expect, test } from 'vitest';
import type { NavItem } from '@pterodactyl/sdk/theme';
import { applyMenu, defaultGroup, groupRows, menuKey, parseMenu, serializeMenu } from './menu';

const item = (id: string, label: string, extensionId?: string): NavItem =>
    ({ id, label, extensionId, icon: undefined, destination: { to: '/' }, group: null, order: 0 }) as unknown as NavItem;

const own = (entry: NavItem) => ({ label: entry.label, icon: 'circle-dot' });

describe('the Menu items setting', () => {
    test('reads leniently: bad JSON, unknown groups, duplicate and empty keys are left out', () => {
        expect(parseMenu('not json')).toEqual({ server: [], account: [] });
        expect(parseMenu('')).toEqual({ server: [], account: [] });
        expect(
            parseMenu(
                JSON.stringify({
                    server: [{ key: ':files', group: 'Nowhere', label: '  Files  ' }, { key: ':files', hidden: true }, { key: '' }, 'junk'],
                    account: [{ key: ':api', hidden: true, label: '' }],
                })
            )
        ).toEqual({
            server: [{ key: ':files', label: 'Files', icon: undefined, hidden: undefined, group: undefined }],
            account: [{ key: ':api', label: undefined, icon: undefined, hidden: true, group: undefined }],
        });
    });

    test('writes only what was changed, and only the menus with entries', () => {
        expect(serializeMenu({ server: [{ key: ':files', label: undefined, hidden: true }], account: [] })).toBe('{"server":[{"key":":files","hidden":true}]}');
        expect(serializeMenu({ server: [], account: [] })).toBe('{}');
    });

    test('keys items by extension and id', () => {
        expect(menuKey(item('files', 'Files'))).toBe(':files');
        expect(menuKey(item('console', 'Console', 'basalt'))).toBe('basalt:console');
    });

    test('groups items by id or label, and extensions apart', () => {
        expect(defaultGroup(item('backups', 'Backups'))).toBe('Files and data');
        expect(defaultGroup(item('console', 'Console', 'basalt'))).toBe('General');
        expect(defaultGroup(item('manager', 'Plugins', 'mc'))).toBe('Game');
        expect(defaultGroup(item('billing', 'Billing', 'shop'))).toBe('Extensions');
        expect(defaultGroup(item('custom', 'Custom'))).toBe('General');
    });

    test('puts placed items first in their order, renames, regroups and hides', () => {
        const items = [item('index', 'Console'), item('files', 'Files'), item('users', 'Users'), item('manager', 'Plugins', 'mc')];
        const rows = applyMenu(
            items,
            [
                { key: ':users', label: 'People', icon: 'users-round' },
                { key: ':files', group: 'General', hidden: true },
            ],
            true,
            own
        );

        expect(rows.map((row) => row.key)).toEqual([':users', ':files', ':index', 'mc:manager']);
        expect(rows[0]).toMatchObject({ label: 'People', icon: 'users-round', group: 'General', original: { label: 'Users', icon: 'circle-dot', group: 'General' } });
        expect(rows[1]).toMatchObject({ group: 'General', hidden: true, original: { group: 'Files and data' } });
        expect(groupRows(rows).map((group) => [group.title, group.rows.length])).toEqual([
            ['General', 3],
            ['Game', 1],
        ]);
    });

    test('outside the server menu, every item is in General', () => {
        const rows = applyMenu([item('files', 'Files')], [{ key: ':files', group: 'Game' }], false, own);
        expect(rows[0].group).toBe('General');
    });
});
