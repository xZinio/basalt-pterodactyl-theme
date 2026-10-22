import type { SVGProps } from 'react';

/** The default logo: a hexagonal basalt column, drawn in the accent colour. */
export default function BrandMark(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox='0 0 32 32' fill='none' aria-hidden {...props}>
            <path d='M16 2.5 27.5 9v14L16 29.5 4.5 23V9z' fill='var(--primary)' />
            <path d='M16 2.5 27.5 9 16 15.5 4.5 9z' fill='white' fillOpacity='0.42' />
            <path d='M16 15.5v14L4.5 23V9z' fill='black' fillOpacity='0.14' />
            <path d='M10.5 12.2 16 15.3l5.5-3.1M16 15.3v6.2' stroke='white' strokeOpacity='0.55' strokeWidth='1.2' strokeLinecap='round' />
        </svg>
    );
}
