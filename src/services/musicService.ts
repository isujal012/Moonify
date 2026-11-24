import { buildDownloadUrls } from './jiosaavnCrypto';

export const API_BASE_URL = 'https://saavn.sumit.co/api';
const JIOSAAVN_PROXY_URL = '/api/jiosaavn';

const decodeHtml = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
};

const buildImageSizes = (img: string) => {
  if (!img) return [];
  return [
    { quality: '50x50', link: img.replace(/150x150|500x500|50x50/, '50x50') },
    { quality: '150x150', link: img.replace(/150x150|500x500|50x50/, '150x150') },
    { quality: '500x500', link: img.replace(/150x150|500x500|50x50/, '500x500') },
  ];
};

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
  name: decodeHtml(s.name || s.title || s.song || 'Unknown Song'),
  album: typeof s.album === 'object' && s.album !== null
    ? { ...s.album, name: decodeHtml(s.album.name || '') }
    : { id: s.albumid || '', name: decodeHtml(s.album || ''), url: s.album_url || '' },
  image: Array.isArray(s.image)
    ? s.image.map((i: any) => ({ quality: i.quality, link: i.url || i.link }))
    : typeof s.image === 'string'
      ? buildImageSizes(s.image)
      : [],
  downloadUrl: Array.isArray(s.downloadUrl)
    ? s.downloadUrl.map((i: any) => ({ quality: i.quality, link: i.url || i.link }))
    : s.encrypted_media_url
      ? buildDownloadUrls(s.encrypted_media_url, s['320kbps'])
      : s.media_preview_url
        ? [{ quality: '96kbps', link: s.media_preview_url }]
        : [],
  duration: s.duration ? parseInt(s.duration) : 0,
  primaryArtists: (() => {
    const pa = s.primaryArtists ?? s.primary_artists ?? s.singers ?? s.music;
    if (typeof pa === 'string' && pa.trim() && pa.trim() !== 'Various Artists') return decodeHtml(pa.trim());
    if (Array.isArray(pa) && pa.length > 0) return decodeHtml(pa.map((a: any) => a.name || a).filter(Boolean).join(', '));
    if (pa && typeof pa === 'object' && pa.name) return decodeHtml(pa.name);
    // Fallback: try artists array field (some API versions use this key)
    const arts = s.artists?.primary || s.artists?.all || s.artists;
    if (Array.isArray(arts) && arts.length > 0) return decodeHtml(arts.map((a: any) => a.name || a).filter(Boolean).join(', '));
    return 'Unknown Artist';
  })(),
});

async function fetchJioSaavn(params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({
    ...params,
    _format: 'json',
    _marker: '0',
    ctx: 'web6dot0',
  });
  const response = await fetch(`${JIOSAAVN_PROXY_URL}?${qs.toString()}`);
  if (!response.ok) throw new Error(`JioSaavn proxy HTTP ${response.status}`);
  return response.json();
}

// Translation module removed to preserve native languages natively via LRCLIB

export const musicService = {
  async searchSongs(query: string): Promise<Song[]> {
    try {
      const data = await fetchJioSaavn({ __call: 'search.getResults', q: query });
      const results = data.results || data.data?.results || [];
      if (results.length > 0) return results.map(mapSong);
    } catch {
      // Fallback to external mirror if proxy is unavailable
    }

    try {
      const response = await fetch(`${API_BASE_URL}/search/songs?query=${encodeURIComponent(query)}`);
      if (!response.ok) return [];
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
      const data = await fetchJioSaavn({ __call: 'song.getDetails', pids: id });
      const song = data[id] || data.songs?.[0];
      if (song) return mapSong(song);
    } catch {
      // Fallback below
    }

    try {
      const response = await fetch(`${API_BASE_URL}/songs?id=${id}`);
      if (!response.ok) return null;
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
      const data = await fetchJioSaavn({ __call: 'reco.getreco', pid: id });
      if (Array.isArray(data) && data.length > 0) return data.map(mapSong);
    } catch {
      // Fallback below
    }

    try {
      const response = await fetch(`${API_BASE_URL}/songs/${id}/suggestions`);
      if (!response.ok) return [];
      const data = await response.json();
      const results = data.data || [];
      return results.map(mapSong);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  },

  async getTrending(): Promise<Song[]> {
    return this.searchSongs('latest');
  },

  async getCharts(): Promise<Song[]> {
    return this.searchSongs('charts');
  },

  async searchArtist(name: string): Promise<any | null> {
    try {
      const data = await fetchJioSaavn({ __call: 'search.getArtistResults', q: name });
      const result = data.results?.[0];
      if (result) {
        try {
          const detail = await fetchJioSaavn({ __call: 'artist.getArtistPageDetails', artistId: result.id });
          if (detail) return detail;
        } catch {
          return result;
        }
        return result;
      }
    } catch {
      // Fallback below
    }

    try {
      const resp = await fetch(`${API_BASE_URL}/search/artists?query=${encodeURIComponent(name)}`);
      if (!resp.ok) return null;
      const data = await resp.json();
      const result = data.data?.results?.[0];
      if (!result) return null;
      const detailResp = await fetch(`${API_BASE_URL}/artists/${result.id}`);
      if (!detailResp.ok) return result;
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
