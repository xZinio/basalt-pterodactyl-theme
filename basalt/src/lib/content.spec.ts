import { expect, test } from 'vitest';
import { fillLink } from './content';

const values = { id: 'a1b2c3d4', uuid: 'a1b2c3d4-0000-4000-8000-000000000000', name: 'My server', ip: '10.0.0.5', port: '25565' };

test('fills in a server\'s values, encoded', () => {
    expect(fillLink('https://map.example.com/{id}?name={name}&at={ip}:{port}', values)).toBe('https://map.example.com/a1b2c3d4?name=My%20server&at=10.0.0.5:25565');
    expect(fillLink('/server/{id}/files', values)).toBe('/server/a1b2c3d4/files');
});

test('leaves out a link it cannot fill or follow', () => {
    expect(fillLink('https://map.example.com/{id}', null)).toBeNull();
    expect(fillLink('javascript:alert(1)', values)).toBeNull();
    expect(fillLink('//example.com', values)).toBeNull();
    expect(fillLink(' https://example.com ', null)).toBe('https://example.com');
});
