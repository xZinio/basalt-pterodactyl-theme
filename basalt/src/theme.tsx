import { lazy } from 'react';
import { defineTheme, lazyView } from '@pterodactyl/sdk/theme';
import { applyAccent, cachedAccent } from './lib/accent';
import { adoptDraft } from './lib/preview';
import { useServerDashboard } from './lib/server';
import { skins } from './skins';
import AuthLayout from './views/auth/AuthLayout';

const auth = () => import('./views/auth');
const areas = () => import('./views/shell/AreaLayouts');
const fields = () => import('./views/admin/Fields');

// In the studio's preview frame the draft replaces the saved settings. Anywhere else the user's
// personal accent is painted before the first render, and the shell reconciles it with their preferences.
if (typeof document !== 'undefined' && !adoptDraft()) {
    const accent = cachedAccent();
    if (accent) applyAccent(accent);
}

/**
 * Basalt. Every view except the sign-in layout loads with its route: the entry stays small, and
 * imports only React, lucide and @pterodactyl/sdk/theme eagerly.
 */
export default defineTheme({
    ui: skins,
    views: {
        'layout.auth': AuthLayout,
        'page.auth.login': lazyView(auth, 'LoginPage'),
        'page.auth.password': lazyView(auth, 'ForgotPasswordPage'),
        'page.auth.passwordReset': lazyView(auth, 'ResetPasswordPage'),
        'page.auth.checkpoint': lazyView(auth, 'CheckpointPage'),

        'layout.app': lazyView(() => import('./views/shell/AppShell')),
        'layout.account': lazyView(areas, 'AreaLayout'),
        'layout.admin': lazyView(areas, 'AreaLayout'),
        'layout.server': lazyView(areas, 'ServerLayout'),
        'app.search': lazyView(() => import('./views/shell/Search')),

        'page.account.overview': lazyView(() => import('./views/account/AccountPage')),
        'account.avatar': lazyView(() => import('./views/account/Avatar')),

        'dashboard.serverList': lazyView(() => import('./views/dashboard/ServerList')),
        'dashboard.serverCard': lazyView(() => import('./views/dashboard/ServerCard')),

        'server.power': lazyView(() => import('./views/server/Power')),
        'server.stats': lazyView(() => import('./views/server/Stats')),
        'page.server.console': lazyView(() => import('./views/server/ConsolePage')),
    },
    setup({ screens, forms, slots }) {
        // Only while the server dashboard is on: it takes the server's first page, so the console moves here.
        screens.register('console', () => import('./screens/ConsoleScreen'), { visible: useServerDashboard });
        // The studio: Basalt's settings beside a live preview, under its own entry in the admin navigation.
        screens.register('studio', () => import('./screens/Studio'));
        // The values the provider's Fields classes declare: egg artwork and a location's country.
        forms.extend('admin.egg', lazy(async () => ({ default: (await fields()).EggArtwork })));
        forms.extend('admin.location', lazy(async () => ({ default: (await fields()).LocationFlag })));
        // The installed Basalt, on the admin overview beside the panel's own version.
        slots.register('panel.overview.before', lazy(() => import('./views/admin/Overview')));
    },
});
