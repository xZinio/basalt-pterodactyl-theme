import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { MAX_BLOCKS, defaultLayout, newBlock, parseLayout, serializeLayout } from './blocks';

const manifest = JSON.parse(readFileSync('extension.json', 'utf8')) as { theme: { settings: Record<string, { default?: unknown }> } };

test('ships the default dashboard as the Layout setting\'s default', () => {
    expect(manifest.theme.settings.dashboardLayout.default).toBe(serializeLayout(defaultLayout));
    expect(parseLayout(manifest.theme.settings.dashboardLayout.default)).toEqual(defaultLayout);
});

test('falls back to the default dashboard for a value that is not a list of blocks', () => {
    for (const value of [null, '', '  ', 'not json', '{"type":"header"}', '42']) {
        expect(parseLayout(value).map((block) => block.id)).toEqual(defaultLayout.map((block) => block.id));
    }
});

test('reads blocks leniently: unknown types and items are left out, the rest takes its default', () => {
    const blocks = parseLayout(
        JSON.stringify([
            { type: 'header', width: 'wide' },
            { type: 'chart' },
            { id: 'tiles', type: 'stats', items: ['cpu', 'gpu', 'players', 7] },
            { id: 'note', type: 'notice', title: 'x'.repeat(200), tone: 'loud' },
            { type: 'banner', height: 'huge', items: ['cpu'] },
            { type: 'info' },
        ])
    );

    expect(blocks.map((block) => block.type)).toEqual(['header', 'stats', 'notice', 'banner', 'info']);
    expect(blocks[0]).toMatchObject({ id: 'header-0', width: 'full' });
    expect(blocks[1].items).toEqual(['cpu', 'players']);
    expect(blocks[2]).toMatchObject({ title: 'x'.repeat(120), text: '', tone: 'info' });
    expect(blocks[3]).toMatchObject({ height: 'medium', items: undefined });
    expect(blocks[4].items).toEqual(newBlock('info').items);
});

test('gives every block its own id and keeps at most thirty', () => {
    const blocks = parseLayout(JSON.stringify(Array.from({ length: 40 }, () => ({ id: 'same', type: 'notes' }))));

    expect(blocks).toHaveLength(MAX_BLOCKS);
    expect(new Set(blocks.map((block) => block.id)).size).toBe(MAX_BLOCKS);
});

test('writes each block without the fields it does not use', () => {
    expect(serializeLayout([{ id: 'graphs', type: 'graphs', width: 'half', items: undefined }])).toBe('[{"id":"graphs","type":"graphs","width":"half"}]');
});
