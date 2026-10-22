/**
 * The console's own page beside the server dashboard. It draws nothing: the engine keeps the
 * console page mounted under every server page, and that page shows the console on this path,
 * so the terminal is never torn down when switching between the dashboard and the console.
 */
export default function ConsoleScreen() {
    return null;
}
