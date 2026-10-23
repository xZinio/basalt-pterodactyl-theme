import { useThemeSettings } from '@pterodactyl/sdk/theme';
import type { ThemeSettings } from '../theme-types';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/** Whether pages and cards animate: the administrator's setting, unless the device asks for reduced motion. */
export const useMotion = (): boolean => useThemeSettings<Partial<ThemeSettings>>().motion !== 'none' && !reduced();

/** How long the theme's transitions take, in milliseconds: the speed setting, or shorter with reduced animation. */
export const motionSpeed = (): number => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--basalt-speed')) || 180;
