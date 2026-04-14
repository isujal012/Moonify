export const API_BASE_URL = 'https://saavn.sumit.co/api';

export interface Song {
  id: string;
  originalId?: string;
  name: string;
  type: string;
  album: {
    id: string;
    name: string;
    url: string;
  };
  year: string;
  releaseDate: string;
  duration: number;
  label: string;
  primaryArtists: string;
  primaryArtistsId: string;
  featuredArtists: string;
  featuredArtistsId: string;
  explicitContent: boolean;
  playCount: number;
  language: string;
  hasLyrics: boolean;
  url: string;
  copyright: string;
  image: { quality: string; link: string }[];
  downloadUrl: { quality: string; link: string }[];
}

const mapSong = (s: any): Song => ({
  ...s,
  name: s.name || s.title || 'Unknown Song',
  image: Array.isArray(s.image) 
    ? s.image.map((i: any) => ({ quality: i.quality, link: i.url || i.link })) 
    : [],
  downloadUrl: Array.isArray(s.downloadUrl) 
    ? s.downloadUrl.map((i: any) => ({ quality: i.quality, link: i.url || i.link })) 
    : [],
  duration: s.duration ? parseInt(s.duration) : 0,
  primaryArtists: (() => {
    const pa = s.primaryArtists;
    if (typeof pa === 'string' && pa.trim() && pa.trim() !== 'Various Artists') return pa.trim();
    if (Array.isArray(pa) && pa.length > 0) return pa.map((a: any) => a.name || a).filter(Boolean).join(', ');
    if (pa && typeof pa === 'object' && pa.name) return pa.name;
    // Fallback: try artists array field (some API versions use this key)
    const arts = s.artists?.primary || s.artists?.all || s.artists;
    if (Array.isArray(arts) && arts.length > 0) return arts.map((a: any) => a.name || a).filter(Boolean).join(', ');
    return 'Unknown Artist';
  })(),
});

// Translation module removed to preserve native languages natively via LRCLIB

export const musicService = {
  // ... other methods ...
  async searchSongs(query: string): Promise<Song[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/search/songs?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      const results = data.data?.results || [];
      return results.map(mapSong);
    } catch (error) {
      console.error('Error searching songs:', error);
      return [];
    }
  },

  async getSongDetails(id: string): Promise<Song | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/songs?id=${id}`);
      const data = await response.json();
      const song = data.data?.[0];
      return song ? mapSong(song) : null;
    } catch (error) {
      console.error('Error fetching song details:', error);
      return null;
    }
  },

  async getRecommendations(id: string): Promise<Song[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/songs/${id}/suggestions`);
      const data = await response.json();
      const results = data.data || [];
      return results.map(mapSong);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  },

  async getTrending(): Promise<Song[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/search/songs?query=latest`);
      const data = await response.json();
      const results = data.data?.results || [];
      return results.map(mapSong);
    } catch (error) {
      console.error('Error fetching trending songs:', error);
      return [];
    }
  },

  async getCharts(): Promise<Song[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/search/songs?query=charts`);
      const data = await response.json();
      const results = data.data?.results || [];
      return results.map(mapSong);
    } catch (error) {
      console.error('Error fetching charts:', error);
      return [];
    }
  },

  async searchArtist(name: string): Promise<any | null> {
    try {
      const resp = await fetch(`${API_BASE_URL}/search/artists?query=${encodeURIComponent(name)}`);
      const data = await resp.json();
      const result = data.data?.results?.[0];
      if (!result) return null;
      // Fetch full artist details
      const detailResp = await fetch(`${API_BASE_URL}/artists/${result.id}`);
      const detail = await detailResp.json();
      return detail.data || result;
    } catch {
      return null;
    }
  },

  async getSyncedLyrics(song: Song): Promise<string | null> {
    const cleanName = (str: string) => {
      if (!str) return '';
      return str
        .replace(/\(feat\..*?\)/gi, '')
        .replace(/\(from\s+".*?"\)/gi, '')
        .replace(/\(from\s+'.*?'\)/gi, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const cleanedTrack = cleanName(song.name);
    const cleanedArtist = song.primaryArtists.split(/[,&]/)[0].trim();

    try {
      // Tier 1: Precise Match (Track, Artist, Duration)
      const preciseQuery = new URLSearchParams({
        track_name: song.name,
        artist_name: song.primaryArtists,
        duration: song.duration.toString()
      });
      let response = await fetch(`https://lrclib.net/api/get?${preciseQuery}`);
      if (response.ok) {
        const data = await response.json();
        if (data.syncedLyrics) return data.syncedLyrics;
      }

      // Tier 2: Fuzzy Match (Cleaned Track + Cleaned First Artist)
      const fuzzySearchQuery = new URLSearchParams({ 
        q: `${cleanedTrack} ${cleanedArtist}`.trim() 
      });
      response = await fetch(`https://lrclib.net/api/search?${fuzzySearchQuery}`);
      if (response.ok) {
        const results = await response.json();
        const bestMatch = results?.find((r: any) => 
          r.syncedLyrics && Math.abs(r.duration - song.duration) < 10
        );
        if (bestMatch) return bestMatch.syncedLyrics;
      }

      // Tier 3: Broad Match (Cleaned Track Only + Duration Check)
      const broadSearchQuery = new URLSearchParams({ q: cleanedTrack });
      response = await fetch(`https://lrclib.net/api/search?${broadSearchQuery}`);
      if (response.ok) {
        const results = await response.json();
        const broadMatch = results?.find((r: any) => 
          r.syncedLyrics && Math.abs(r.duration - song.duration) < 5
        );
        if (broadMatch) return broadMatch.syncedLyrics;
      }

      // Premium Fallback String
      return `[00:00.00]  \n[00:01.50] ✦ Visualizing Cosmic Harmonies\n[00:06.00] Enjoy the celestial vibes\n[99:99.99]  `;
    } catch (error) {
      console.error('Error fetching synced lyrics:', error);
      return `[00:00.00]  \n[00:01.50] ✦ Visualizing Cosmic Harmonies\n[00:06.00] Enjoy the celestial vibes\n[99:99.99]  `;
    }
  }
};
