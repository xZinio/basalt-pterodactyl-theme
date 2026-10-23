type Bootstrap = { SiteConfiguration?: { name?: string; theme?: { settings?: Record<string, unknown> } } };

const site = () => (window as Window & Bootstrap).SiteConfiguration;

/** The theme settings the page was served with, or the studio's draft in its preview frame. */
export const bootstrapSettings = (): Readonly<Record<string, unknown>> => site()?.theme?.settings ?? {};

/** The Panel name setting: the panel's name wherever the panel reads it, from the first render. */
export function applyPanelName(): void {
    const config = site();
    const name = bootstrapSettings().panelName;
    if (!config || typeof name !== 'string' || name.trim() === '') return;

    if (document.title === config.name) document.title = name.trim();
    config.name = name.trim();
}
