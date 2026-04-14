import { musicService } from './musicService';
import type { Song } from './musicService';
import type { UserAiProfile } from '../store/types';

export interface ScoredSong {
  song: Song;
  score: number;
  confidence: number;
  type: 'familiar' | 'discovery';
  reason: string;
}

const ACTION_WEIGHTS = {
  LIKE: 15,
  FULL_PLAY: 8,
  SEARCH: 5,
  SKIP: -20,
  PARTIAL_PLAY: 2,
};

export const aiService = {
  /**
   * Generates a ranked list of recommendations based on user preferences and behavior.
   * Enforces 70% familiar / 30% discovery split.
   */
  async getRankedRecommendations(
    profile: UserAiProfile,
    likedSongs: Song[],
    limit: number = 10
  ): Promise<ScoredSong[]> {
    const { preferences, stats } = profile;
    try {
      // 1. Fetch Candidate Pools
      const familiarCandidates: Song[] = [];
      const discoveryCandidates: Song[] = [];

      // A. Content-Based (Based on top artists/genres)
      const topArtists = Object.entries(preferences.artistWeights)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10) // Get more candidates
        .sort(() => Math.random() - 0.5) // Shuffle them to get variety on every call
        .slice(0, 3)
        .map(([name]) => name);

      for (const artist of topArtists) {
        const results = await musicService.searchSongs(artist);
        familiarCandidates.push(...results.slice(0, 3));
      }

      // B. Liked Song Similarities
      if (likedSongs.length > 0) {
        const seed = likedSongs[Math.floor(Math.random() * likedSongs.length)];
        const recs = await musicService.getRecommendations(seed.id);
        familiarCandidates.push(...recs);
      }

      // C. Discovery Pool (Trending/Charts/New)
      const trending = await musicService.getTrending();
      discoveryCandidates.push(...trending);

      // 2. Scoring Logic
      const allScored: ScoredSong[] = [];
      const currentHour = new Date().getHours();
      const timeGenres = stats.timePatterns[currentHour] || [];
      const recentSearches = stats.searchHistory.map(q => q.toLowerCase());

      const processCandidates = (candidates: Song[], type: 'familiar' | 'discovery') => {
        candidates.forEach(song => {
          if (allScored.some(s => s.song.id === song.id)) return;
          
          let score = type === 'familiar' ? 50 : 20;
          let reasons: string[] = [];

          const artistWeight = preferences.artistWeights[song.primaryArtists] || 0;
          if (artistWeight !== 0) {
            score += artistWeight;
            if (artistWeight > 0) reasons.push(`You enjoy ${song.primaryArtists}`);
          }

          const langWeight = preferences.languageWeights[song.language] || 0;
          score += langWeight;

          if (timeGenres.includes(song.language) || timeGenres.includes(song.primaryArtists)) {
             score += 10;
             reasons.push('Matches your typical listening time');
          }

          if (recentSearches.some(q => song.name.toLowerCase().includes(q) || song.primaryArtists.toLowerCase().includes(q))) {
            score += 15;
            reasons.push('Matches your recent searches');
          }

          if (stats.recentSkips.includes(song.id)) {
            score -= 50;
          }

          const confidence = Math.min(0.99, Math.max(0.1, (score + 50) / 200));

          allScored.push({
            song,
            score,
            confidence,
            type,
            reason: reasons[0] || (type === 'familiar' ? 'Based on your favorites' : 'Discovering new cosmic vibes')
          });
        });
      };

      processCandidates(familiarCandidates, 'familiar');
      processCandidates(discoveryCandidates, 'discovery');

      const sortedFamiliar = allScored.filter(s => s.type === 'familiar').sort((a, b) => b.score - a.score);
      const sortedDiscovery = allScored.filter(s => s.type === 'discovery').sort((a, b) => b.score - a.score);

      const finalQueue: ScoredSong[] = [];
      const targetSize = limit;

      for (let i = 0; i < targetSize; i++) {
        if (i % 3 === 0 && sortedDiscovery.length > 0) {
          finalQueue.push(sortedDiscovery.shift()!);
        } else if (sortedFamiliar.length > 0) {
          finalQueue.push(sortedFamiliar.shift()!);
        }
      }

      return finalQueue;
    } catch (error) {
      console.error('AI Recommendation System Failure:', error);
      const trending = await musicService.getTrending();
      return trending.slice(0, 10).map(s => ({
        song: s,
        score: 0,
        confidence: 0.5,
        type: 'discovery',
        reason: 'Fallback trending'
      }));
    }
  },

  /**
   * Logs a user interaction and updates preference vectors.
   */
  logInteraction(
    song: Song,
    action: keyof typeof ACTION_WEIGHTS,
    profile: UserAiProfile
  ): UserAiProfile {
    const nextProfile = JSON.parse(JSON.stringify(profile)); // Deep copy
    const weight = ACTION_WEIGHTS[action];

    // Update Artist Weights
    if (song.primaryArtists) {
      const current = nextProfile.preferences.artistWeights[song.primaryArtists] || 0;
      nextProfile.preferences.artistWeights[song.primaryArtists] = current + weight;
    }

    // Update Language Weights
    if (song.language) {
      const current = nextProfile.preferences.languageWeights[song.language] || 0;
      nextProfile.preferences.languageWeights[song.language] = current + weight;
    }

    // Update Stats
    if (action === 'SKIP') {
      nextProfile.stats.skipCount++;
      if (!nextProfile.stats.recentSkips.includes(song.id)) {
        nextProfile.stats.recentSkips = [song.id, ...nextProfile.stats.recentSkips.slice(0, 19)];
      }
    } else if (action === 'FULL_PLAY') {
      nextProfile.stats.listenCount++;
      const hour = new Date().getHours();
      const currentPatterns = nextProfile.stats.timePatterns[hour] || [];
      if (!currentPatterns.includes(song.language)) {
        nextProfile.stats.timePatterns[hour] = [song.language, ...currentPatterns.slice(0, 2)];
      }
    }

    return nextProfile;
  },

  async getAiSummary(song: Song): Promise<string> {
    const vibes = ['Nebular', 'Supernova', 'Quantum', 'Void', 'Stellar', 'Galactic'];
    const vibe = vibes[Math.floor(Math.random() * vibes.length)];
    return `${song.name} resonates with a ${vibe} energy signature. Ideal for deep space transit.`;
  },

  async getRecommendationsForUser(songs: Song[]): Promise<Song[]> {
    if (!songs.length) return [];
    return musicService.getRecommendations(songs[0].id);
  }
};
