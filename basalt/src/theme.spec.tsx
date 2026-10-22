import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, expect, test } from 'vitest';
import { screen } from '@testing-library/react';
import { preloadTheme, renderView, type RenderedView } from '@pterodactyl/sdk/testing';
import theme from './theme';

const themes = [theme];
let rendered: RenderedView | undefined;

// The panel renders the theme's settings into the page, each at its default until an administrator changes it.
const manifest = JSON.parse(readFileSync('extension.json', 'utf8')) as { theme: { settings: Record<string, { default?: unknown }> } };
const settings = Object.fromEntries(Object.entries(manifest.theme.settings).map(([key, setting]) => [key, setting.default ?? null]));

// It also hydrates the signed-in user from the page; the dashboard and server views read them.
Object.assign(window, {
    SiteConfiguration: { ...(window as { SiteConfiguration?: object }).SiteConfiguration, theme: { id: 'basalt', chain: [], settings, scheme: 'dark', schemes: ['dark', 'light'], safeMode: false, preview: false } },
    PterodactylUser: {
        uuid: 'a2f2c9a4-2c2d-4f6b-9d2a-5e9c9d1b7e10',
        username: 'demo',
        email: 'demo@example.com',
        language: 'en',
        root_admin: true,
        use_totp: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    },
});

// Basalt's views are lazy; loading their chunks first lets renderView render them synchronously.
beforeAll(() => preloadTheme(themes));
afterEach(() => rendered?.unmount());

test("opens a server on its dashboard and keeps the console mounted, with its slots, beside it", () => {
    rendered = renderView('page.server.console', {
        themes,
        fixture: 'default',
        slots: { 'server.console.before': () => <p>Console extension</p> },
    });

    expect(screen.getByRole('heading', { name: 'Quick actions' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Server information' })).not.toBeNull();
    expect(screen.getByText('Console extension').closest('[hidden]')).not.toBeNull();
});

test('names the server\'s first page Dashboard in the sidebar', () => {
    rendered = renderView('layout.app', { themes, fixture: 'serverArea' });

    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toBeNull();
    expect(screen.queryByRole('link', { name: 'Overview' })).toBeNull();
});

test('links each server card to the server and its console', () => {
    rendered = renderView('dashboard.serverList', { themes, fixture: 'servers' });

    const card = rendered.container.querySelector('li a[href^="/server/"]')?.closest('li');
    const links = [...(card?.querySelectorAll('a') ?? [])].map((link) => link.getAttribute('href') ?? '');

    expect(links[0]).toMatch(/^\/server\/[^/]+$/);
    expect(links.some((href) => /^\/server\/[^/]+\/console$/.test(href))).toBe(true);
    expect(links.some((href) => /^\/server\/[^/]+\/files/.test(href))).toBe(true);
});

test('keeps the engine field attributes on the sign-in form', () => {
    rendered = renderView('page.auth.login', { themes, fixture: 'invalid' });

    const password = screen.getByLabelText('Password');

    expect(password.getAttribute('autocomplete')).toBe('current-password');
    expect(password.getAttribute('aria-invalid')).toBe('true');
});
