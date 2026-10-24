/** The panel's prefix of its own messages in the console: "container@pterodactyl~" in bold yellow. */
const PANEL_PRELUDE = '\u001b[1m\u001b[33mcontainer@pterodactyl~ \u001b[0m';
const PANEL_TEXT = 'container@pterodactyl~';
const PANEL_COLOR = '#ffff66';

let replacement: string | null = null;
let patched = false;

/** A colour as the terminal's 24-bit foreground escape; yellow for one that is not a hex colour. */
function foreground(color: string): string {
    const hex = color.trim().replace(/^#/, '');
    const full = hex.length === 3 || hex.length === 4 ? [...hex.slice(0, 3)].map((digit) => digit + digit).join('') : hex.slice(0, 6);
    if (!/^[0-9a-f]{6}$/i.test(full)) return '\u001b[33m';

    const value = Number.parseInt(full, 16);
    return `\u001b[38;2;${(value >> 16) & 255};${(value >> 8) & 255};${value & 255}m`;
}

/**
 * The Command prelude and Prelude color settings. The console's terminal encodes the text it is
 * given with TextEncoder, so the panel's prefix is swapped there for the setting's text in its
 * colour, or dropped when the text is empty. The panel's own prefix leaves the encoder alone.
 */
export function setPrelude(text: unknown, color: unknown): void {
    const clean = typeof text === 'string' ? text.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim() : PANEL_TEXT;
    const tint = typeof color === 'string' ? color : PANEL_COLOR;

    if (clean === PANEL_TEXT && tint.trim().toLowerCase() === PANEL_COLOR) {
        replacement = null;
        return;
    }
    replacement = clean === '' ? '' : `\u001b[1m${foreground(tint)}${clean} \u001b[0m`;

    if (patched || typeof TextEncoder === 'undefined') return;
    patched = true;
    const encode = TextEncoder.prototype.encode;
    TextEncoder.prototype.encode = function (input?: string) {
        return replacement !== null && typeof input === 'string' && input.includes(PANEL_PRELUDE)
            ? encode.call(this, input.split(PANEL_PRELUDE).join(replacement))
            : encode.call(this, input);
    };
}
