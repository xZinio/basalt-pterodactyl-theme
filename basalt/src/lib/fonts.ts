/** The Google Fonts family of each font setting option that loads from Google Fonts. */
const googleFamilies: Readonly<Record<string, string>> = {
    inter: 'Inter',
    roboto: 'Roboto',
    open_sans: 'Open Sans',
    lato: 'Lato',
    montserrat: 'Montserrat',
    nunito_sans: 'Nunito Sans',
    source_sans_3: 'Source Sans 3',
    manrope: 'Manrope',
    dm_sans: 'DM Sans',
    work_sans: 'Work Sans',
    outfit: 'Outfit',
    merriweather: 'Merriweather',
    playfair_display: 'Playfair Display',
    roboto_mono: 'Roboto Mono',
    jetbrains_mono: 'JetBrains Mono',
};

/**
 * The Google Fonts stylesheet a font setting needs, or null for Poppins, IBM Plex Sans and the
 * system font, which need none, and for a custom URL that is not Google Fonts'.
 */
export function fontStylesheet(font: unknown, customUrl: unknown): string | null {
    const family = typeof font === 'string' ? googleFamilies[font] : undefined;
    if (family) return `https://fonts.googleapis.com/css2?${new URLSearchParams({ family: `${family}:wght@400;500;600;700`, display: 'swap' })}`;
    if (font === 'custom' && typeof customUrl === 'string' && customUrl.startsWith('https://fonts.googleapis.com/')) return customUrl;
    return null;
}

/** Links the configured font's stylesheet, before the first render. */
export function loadFont(): void {
    const settings = (window as Window & { SiteConfiguration?: { theme?: { settings?: Record<string, unknown> } } }).SiteConfiguration?.theme?.settings ?? {};
    const href = fontStylesheet(settings.font, settings.fontUrl);
    if (!href) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.append(link);
}
