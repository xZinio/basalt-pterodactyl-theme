import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@pterodactyl/sdk';

const BASE = '/api/client/extensions/basalt';

export interface Folder {
    readonly id: string;
    readonly name: string;
    readonly icon: string | null;
    readonly servers: readonly string[];
}

export interface Preferences {
    readonly folders: readonly Folder[];
    readonly favorites: readonly string[];
    readonly order: readonly string[];
    readonly accent: string | null;
}

export interface ServerMeta {
    readonly egg: string | null;
    readonly banner: string | null;
    readonly location: string | null;
    readonly flag: string | null;
    readonly minecraft: boolean;
}

export interface Players {
    readonly online: number;
    readonly max: number;
    readonly version: string | null;
}

const empty: Preferences = { folders: [], favorites: [], order: [], accent: null };
export const preferencesKey = ['basalt', 'preferences'] as const;

/** The signed-in user's folders, favourites, card order and accent. */
export function usePreferences(): Preferences {
    const { data } = useQuery({
        queryKey: preferencesKey,
        queryFn: async () => (await http.get<Preferences>(`${BASE}/preferences`)).data,
        staleTime: 5 * 60_000,
    });
    return data ?? empty;
}

/** Saves part of the preferences; the change shows at once and is undone if the save fails. */
export function useUpdatePreferences() {
    const client = useQueryClient();

    return useMutation({
        mutationFn: async (patch: Partial<Preferences>) => (await http.put<Preferences>(`${BASE}/preferences`, patch)).data,
        onMutate: async (patch) => {
            await client.cancelQueries({ queryKey: preferencesKey });
            const previous = client.getQueryData<Preferences>(preferencesKey);
            client.setQueryData<Preferences>(preferencesKey, { ...(previous ?? empty), ...patch });
            return { previous };
        },
        onError: (_error, _patch, context) => {
            if (context?.previous) client.setQueryData(preferencesKey, context.previous);
        },
        onSuccess: (data) => client.setQueryData(preferencesKey, data),
    });
}

const sorted = (uuids: readonly string[]) => [...uuids].sort();

/** Egg artwork and location of the given servers. */
export function useServerMeta(uuids: readonly string[]): Record<string, ServerMeta> {
    const key = sorted(uuids);
    const { data } = useQuery({
        queryKey: ['basalt', 'servers', key],
        queryFn: async () =>
            (await http.get<{ servers: Record<string, ServerMeta> }>(`${BASE}/servers`, { params: { uuids: key } })).data.servers,
        enabled: key.length > 0,
        staleTime: 5 * 60_000,
    });
    return data ?? {};
}

/** Players online on the given servers that run Minecraft, refreshed every thirty seconds. */
export function usePlayers(uuids: readonly string[]): Record<string, Players | null> {
    const key = sorted(uuids);
    const { data } = useQuery({
        queryKey: ['basalt', 'players', key],
        queryFn: async () =>
            (await http.get<{ servers: Record<string, Players | null> }>(`${BASE}/players`, { params: { uuids: key } })).data.servers,
        enabled: key.length > 0,
        refetchInterval: 30_000,
        staleTime: 25_000,
    });
    return data ?? {};
}
