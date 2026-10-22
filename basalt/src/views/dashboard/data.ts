import { createContext, useContext } from 'react';
import { usePlayers, useServerMeta, type Players, type ServerMeta } from '../../lib/api';

interface DashboardData {
    readonly meta: Record<string, ServerMeta>;
    readonly players: Record<string, Players | null>;
}

/** The list fetches artwork and players for its whole page at once and hands them to its cards. */
export const DashboardDataContext = createContext<DashboardData | null>(null);

/** One server's artwork and players: from the list around it, or fetched on its own outside one. */
export function useCardData(uuid: string): { meta: ServerMeta | undefined; players: Players | null | undefined } {
    const shared = useContext(DashboardDataContext);
    const ownMeta = useServerMeta(shared ? [] : [uuid]);
    const meta = shared ? shared.meta[uuid] : ownMeta[uuid];
    const ownPlayers = usePlayers(!shared && meta?.minecraft ? [uuid] : []);

    return { meta, players: shared ? shared.players[uuid] : ownPlayers[uuid] };
}
