import { useRef, useSyncExternalStore } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Cpu, HardDrive, MemoryStick, X } from 'lucide-react';
import { useServerWebsocketEvent, type SdkServer } from '@pterodactyl/sdk';
import { useThemeSettings } from '@pterodactyl/sdk/theme';
import { externalProps } from '../../lib/links';
import type { ThemeSettings } from '../../theme-types';

type Resource = 'memory' | 'cpu' | 'disk';

const resources: readonly Resource[] = ['memory', 'cpu', 'disk'];

const titles: Record<Resource, string> = {
    memory: 'Your server is running low on memory',
    cpu: 'Your server is running low on CPU',
    disk: 'Your server is running low on disk space',
};

const what: Record<Resource, string> = { memory: 'its memory', cpu: 'its CPU', disk: 'its disk space' };

const icons: Record<Resource, LucideIcon> = { memory: MemoryStick, cpu: Cpu, disk: HardDrive };

/** CPU use must stay over its limit for this many reports, about ten seconds, to raise its alert. */
const CPU_REPORTS = 5;

const MIB = 1024 * 1024;

// The alerts raised on this page, by server: they stay until the page reloads.
const raised = new Map<string, ReadonlySet<Resource>>();
// The alerts dismissed in this tab, by server.
const dismissed = new Map<string, ReadonlySet<Resource>>();
const listeners = new Set<() => void>();
const none: ReadonlySet<Resource> = new Set();

const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

function raise(server: string, resource: Resource): void {
    const current = raised.get(server) ?? none;
    if (current.has(resource)) return;
    raised.set(server, new Set([...current, resource]));
    notify();
}

const dismissedKey = (server: string) => `basalt.alerts.dismissed.${server}`;

function dismissedFor(server: string): ReadonlySet<Resource> {
    let found = dismissed.get(server);
    if (!found) {
        try {
            const saved: unknown = JSON.parse(window.sessionStorage.getItem(dismissedKey(server)) ?? '[]');
            found = new Set(Array.isArray(saved) ? saved.filter((item): item is Resource => resources.includes(item as Resource)) : []);
        } catch {
            found = new Set();
        }
        dismissed.set(server, found);
    }
    return found;
}

function dismiss(server: string, resource: Resource): void {
    const next = new Set([...dismissedFor(server), resource]);
    dismissed.set(server, next);
    try {
        window.sessionStorage.setItem(dismissedKey(server), JSON.stringify([...next]));
    } catch {
        // Without storage it stays dismissed until the page reloads.
    }
    notify();
}

const percentOf = (value: unknown) => Math.max(0, Math.min(100, Number(value) || 0));

/**
 * The Resource alerts settings: a warning on the server's dashboard and console once its memory or
 * disk use passes the setting's share of its limit, or its CPU use stays over it. A server without
 * a limit for a resource never gets its alert. Each can be dismissed for the rest of the session.
 */
export default function ResourceAlerts({ server }: { server: SdkServer }) {
    const settings = useThemeSettings<ThemeSettings>();
    const thresholds: Record<Resource, number> = {
        memory: percentOf(settings.memoryAlert),
        cpu: percentOf(settings.cpuAlert),
        disk: percentOf(settings.diskAlert),
    };
    const { identifier, limits } = server.attributes;
    const shown = useSyncExternalStore(subscribe, () => raised.get(identifier) ?? none, () => none);
    const hidden = useSyncExternalStore(subscribe, () => dismissedFor(identifier), () => none);
    const cpuReports = useRef(0);
    const upgrade = /^https?:\/\//i.test(settings.upgradeUrl.trim()) ? settings.upgradeUrl.trim() : null;
    const message = settings.alertMessage.trim();

    useServerWebsocketEvent('stats', (data) => {
        try {
            const stats = JSON.parse(data) as { memory_bytes?: unknown; disk_bytes?: unknown; cpu_absolute?: unknown };
            if (thresholds.memory > 0 && limits.memory > 0 && typeof stats.memory_bytes === 'number') {
                if ((stats.memory_bytes / (limits.memory * MIB)) * 100 >= thresholds.memory) raise(identifier, 'memory');
            }
            if (thresholds.disk > 0 && limits.disk > 0 && typeof stats.disk_bytes === 'number') {
                if ((stats.disk_bytes / (limits.disk * MIB)) * 100 >= thresholds.disk) raise(identifier, 'disk');
            }
            if (thresholds.cpu > 0 && limits.cpu > 0 && typeof stats.cpu_absolute === 'number') {
                cpuReports.current = (stats.cpu_absolute / limits.cpu) * 100 >= thresholds.cpu ? cpuReports.current + 1 : 0;
                if (cpuReports.current >= CPU_REPORTS) raise(identifier, 'cpu');
            }
        } catch {
            // Not a stats report.
        }
    });

    const alerts = resources.filter((resource) => thresholds[resource] > 0 && shown.has(resource) && !hidden.has(resource));
    if (alerts.length === 0) return null;

    return (
        <div className='mb-4 grid gap-3'>
            {alerts.map((resource) => {
                const Icon = icons[resource];
                return (
                    <div key={resource} role='status' data-resource={resource} className='basalt-notice flex items-start gap-3 px-4 py-3.5 [--notice-tone:var(--warning)]'>
                        <Icon className='mt-0.5 size-[18px] shrink-0 text-(--notice-tone)' aria-hidden />
                        <div className='min-w-0 flex-1'>
                            <p className='text-[15px] leading-[1.5] font-semibold'>{titles[resource]}</p>
                            <p className='mt-0.5 text-sm leading-[1.5] whitespace-pre-line text-muted-foreground'>
                                {message || `It is using more than ${thresholds[resource]}% of ${what[resource]}. Upgrade your plan to keep it running smoothly.`}
                            </p>
                        </div>
                        {upgrade && (
                            <a href={upgrade} {...externalProps(upgrade)} className='basalt-notice-button self-center'>
                                Upgrade
                            </a>
                        )}
                        <button type='button' aria-label='Dismiss' title='Dismiss' onClick={() => dismiss(identifier, resource)} className='basalt-notice-close self-center'>
                            <X className='size-[15px]' aria-hidden />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
