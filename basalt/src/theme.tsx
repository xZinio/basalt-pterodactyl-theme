import { defineTheme, lazyView } from '@pterodactyl/sdk/theme';
import { useServerDashboard } from './lib/server';
import { skins } from './skins';
import AuthLayout from './views/auth/AuthLayout';

const auth = () => import('./views/auth');
const areas = () => import('./views/shell/AreaLayouts');

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

        'dashboard.serverList': lazyView(() => import('./views/dashboard/ServerList')),
        'dashboard.serverCard': lazyView(() => import('./views/dashboard/ServerCard')),

        'server.power': lazyView(() => import('./views/server/Power')),
        'server.stats': lazyView(() => import('./views/server/Stats')),
        'page.server.console': lazyView(() => import('./views/server/ConsolePage')),
    },
    setup({ screens }) {
        // Only while the server dashboard is on: it takes the server's first page, so the console moves here.
        screens.register('console', () => import('./screens/ConsoleScreen'), { visible: useServerDashboard });
    },
});
