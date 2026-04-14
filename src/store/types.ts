export interface UserPreferences {
  genreWeights: Record<string, number>;
  artistWeights: Record<string, number>;
  languageWeights: Record<string, number>;
}

export interface UserStats {
  skipCount: number;
  listenCount: number;
  searchHistory: string[];
  recentSkips: string[]; // Song IDs
  timePatterns: Record<number, string[]>; // Hour (0-23) -> Top Genres
}

export interface UserAiProfile {
  preferences: UserPreferences;
  stats: UserStats;
}
