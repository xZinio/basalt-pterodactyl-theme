import { Globe } from 'lucide-react';
import { cn } from '@pterodactyl/sdk';

// Flags of the countries hosting providers most often run nodes in (flag-icons, MIT; see flags/LICENSE.txt).
const flags = import.meta.glob<string>('../flags/*.svg', { query: '?url', import: 'default', eager: true });

/** The two-letter codes of the countries there is a flag for. */
export const flagCodes: readonly string[] = Object.keys(flags).map((path) => path.slice(-6, -4));

const regionNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;

/** The English name of a two-letter country code, such as "Netherlands" for "nl". */
export function countryName(code: string): string {
    try {
        return regionNames?.of(code.toUpperCase()) ?? code.toUpperCase();
    } catch {
        return code.toUpperCase();
    }
}

export default function Flag({ code, className }: { code: string; className?: string }) {
    const url = flags[`../flags/${code.toLowerCase()}.svg`];

    return url ? (
        <img src={url} alt='' width={18} height={14} className={cn('h-3.5 w-[18px] shrink-0 rounded-[2px] object-cover ring-1 ring-foreground/12', className)} />
    ) : (
        <Globe className={cn('size-3.5 shrink-0 text-muted-foreground', className)} aria-hidden />
    );
}
