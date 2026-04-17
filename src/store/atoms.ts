import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { Song } from '../services/musicService';
import type { User } from 'firebase/auth';
import type { UserAiProfile } from './types';

// User State
export const userAtom = atom<User | null>(null);
export const userProfileAtom = atom<{ handle: string; likedSongs: string[]; playlists: any[] } | null>(null);

// Local Persisted Libraries
export const localLikedSongsAtom = atomWithStorage<Song[]>('cosmic_liked_songs', []);
export const localPlaylistsAtom = atomWithStorage<{id: string, name: string, songs: Song[]}[]>('cosmic_multi_playlists_v1', [
  { id: 'default-1', name: 'My Playlist', songs: [] }
]);

// Audio State
export const currentSongAtom = atomWithStorage<Song | null>('cosmic_current_song', null);
export const isPlayingAtom = atom<boolean>(false);
export const playlistAtom = atomWithStorage<Song[]>('cosmic_current_queue', []);
export const volumeAtom = atomWithStorage<number>('cosmic_volume', 0.7);
export const currentTimeAtom = atomWithStorage<number>('cosmic_current_time', 0);
export const lyricsAtom = atom<string | null>(null);

// AI Learning State
export const userAiProfileAtom = atomWithStorage<UserAiProfile>('cosmic_ai_profile_v3', {
  preferences: {
    genreWeights: {},
    artistWeights: {},
    languageWeights: {}
  },
  stats: {
    skipCount: 0,
    listenCount: 0,
    searchHistory: [],
    recentSkips: [],
    timePatterns: {}
  }
});

// Backward compatibility for stale module references
export const userPreferencesAtom = atom((get) => get(userAiProfileAtom).preferences);
export const userStatsAtom = atom((get) => get(userAiProfileAtom).stats);

// UI State
export const isSearchOpenAtom = atom<boolean>(false);
export const isDashboardOpenAtom = atom<boolean>(true); // Open by default after login
export const isAuthModalOpenAtom = atom<boolean>(false);
export const cameraTargetAtom = atom<[number, number, number] | null>(null);
