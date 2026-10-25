import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@pterodactyl/sdk';
import { emptyContent, type Content } from './content';

const BASE = '/api/client/extensions/basalt';
const ADMIN = '/api/admin/extensions/basalt';

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
    /** The user's own note on each server, by its UUID. */
    readonly notes: Readonly<Record<string, string>>;
    /** The announcements the user dismissed. */
    readonly dismissed: readonly string[];
    /** What the administrator wrote for every user's pages, which comes with the preferences. */
    readonly content: Content;
}

export interface ServerMeta {
    readonly egg: string | null;
    readonly eggId: number | null;
    readonly nodeId: number;
    readonly banner: string | null;
    readonly location: string | null;
    /** The name the administrator gave the location in place of its country's. */
    readonly locationLabel: string | null;
    readonly flag: string | null;
    /** Its egg is one the player count reads. */
    readonly minecraft: boolean;
}

export interface Players {
    readonly online: number;
    readonly max: number;
    readonly version: string | null;
}

const empty: Preferences = { folders: [], favorites: [], order: [], accent: null, notes: {}, dismissed: [], content: emptyContent };
export const preferencesKey = ['basalt', 'preferences'] as const;

/** The signed-in user's folders, favourites, card order, accent and the rest, with the content; `loaded` once they have arrived. */
export function usePreferences(): Preferences & { readonly loaded: boolean } {
    const { data } = useQuery({
        queryKey: preferencesKey,
        queryFn: async () => (await http.get<Preferences>(`${BASE}/preferences`)).data,
        staleTime: 5 * 60_000,
    });
    return { ...(data ?? empty), loaded: data !== undefined };
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

/** Saves the user's note on a server; an empty note is removed. */
export function useSaveNote() {
    const client = useQueryClient();

    return useMutation({
        mutationFn: async ({ server, text }: { server: string; text: string }) =>
            (await http.put<{ notes: Record<string, string> }>(`${BASE}/notes/${server}`, { text })).data.notes,
        onSuccess: (notes) => {
            const previous = client.getQueryData<Preferences>(preferencesKey);
            if (previous) client.setQueryData<Preferences>(preferencesKey, { ...previous, notes });
        },
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

export interface Languages {
    /** The language the panel is shown in for the user. */
    readonly language: string;
    /** The panel's installed languages, each named in itself, by code. */
    readonly languages: Readonly<Record<string, string>>;
}

const languageKey = ['basalt', 'language'] as const;

export function useLanguages(): Languages | undefined {
    return useQuery({
        queryKey: languageKey,
        queryFn: async () => (await http.get<Languages>(`${BASE}/language`)).data,
        staleTime: 5 * 60_000,
    }).data;
}

/** Saves the user's language; the panel follows its current user's language, so it switches at once. */
export function useUpdateLanguage() {
    const client = useQueryClient();

    return useMutation({
        mutationFn: async (language: string) => (await http.put<Languages>(`${BASE}/language`, { language })).data,
        onSuccess: (data) => {
            client.setQueryData(languageKey, data);
            void client.invalidateQueries({ queryKey: ['account', 'current-user'] });
        },
    });
}

export interface BasaltVersion {
    readonly current: string;
    /** The latest release on GitHub; null while there is none or GitHub cannot be reached. */
    readonly latest: string | null;
    readonly is_latest: boolean | null;
}

/** The installed Basalt and its latest release, for administrators. */
export function useBasaltVersion(): BasaltVersion | undefined {
    return useQuery({
        queryKey: ['basalt', 'version'],
        queryFn: async () => (await http.get<BasaltVersion>(`${ADMIN}/version`)).data,
        staleTime: 30 * 60_000,
    }).data;
}
