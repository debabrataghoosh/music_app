"use client";

import React, { useState, useEffect } from "react";
import { YOUTUBE_API_KEY } from "@/app/youtube-search-config";
import { Search, X, Clock, TrendingUp } from "lucide-react";

interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
}

interface YouTubeSearchBarProps {
  onSelect: (result: YouTubeSearchResult) => void;
  currentSong?: {
    title: string;
    channel: string;
  };
  onQuotaExceeded?: (exceeded: boolean) => void;
}

export const YouTubeSearchBar: React.FC<YouTubeSearchBarProps> = ({ onSelect, currentSong, onQuotaExceeded }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [contextualSuggestions, setContextualSuggestions] = useState<string[]>([]);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setError("");
    setResults([]);
    setShowSuggestions(false);
    
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encodeURIComponent(query + ' music song')}&videoCategoryId=10&key=${YOUTUBE_API_KEY}`
      );
      const data = await res.json();
      
      if (data.error) {
        if (data.error.code === 403 && data.error.message.includes('quota')) {
          setQuotaExceeded(true);
          onQuotaExceeded?.(true);
          throw new Error("YouTube API quota exceeded. Please try again later or contact support.");
        } else {
          throw new Error(data.error.message);
        }
      }
      
      if (!data.items || data.items.length === 0) {
        setError("No music found for this search. Try a different song or artist.");
        return;
      }
      
      const items = data.items.map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium.url,
      }));
      
      setResults(items);
    } catch (err: any) {
      setError(err.message || "Failed to fetch results. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setError("");
    setShowSuggestions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <div className="w-full relative">
      <form onSubmit={handleSearch} className="flex items-center">
        <div className="flex flex-1 items-center rounded-full bg-white/10 backdrop-blur-lg px-4 py-3 gap-3 focus-within:ring-2 focus-within:ring-blue-400 transition-all">
          <Search className="text-white w-5 h-5" />
          <input
            type="text"
            className="flex-1 bg-transparent outline-none text-white placeholder:text-white/70 text-base font-medium"
            placeholder="Search for songs, artists, or albums..."
            value={query}
            onChange={handleInputChange}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="text-white/70 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all"
          >
            Search
          </button>
        </div>
      </form>

      {loading && (
        <div className="text-center text-white mt-4 py-8">
          <div className="inline-block w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mb-2"></div>
          <div className="text-white/70">Searching for music...</div>
        </div>
      )}
      {error && (
        <div className="text-red-300 text-center mb-2 mt-4 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
          <div className="mb-2">{error}</div>
          {error.includes('quota') && (
            <div className="text-sm text-red-200">
              <p>💡 Try these alternatives:</p>
              <ul className="mt-2 space-y-1 text-left">
                <li>• Use the trending songs section below</li>
                <li>• Try searching for popular artists</li>
                <li>• Check back later when quota resets</li>
              </ul>
            </div>
          )}
        </div>
      )}
      {results.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Search Results</h3>
            <span className="text-white/70 text-sm">{results.length} songs found</span>
          </div>
          <div className="grid gap-3">
            {results.map(result => (
              <div
                key={result.videoId}
                className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer transition-all group border border-white/10"
                onClick={() => onSelect(result)}
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                  <img 
                    src={result.thumbnail} 
                    alt={result.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                    {result.title}
                  </div>
                  <div className="text-sm text-white/70 truncate">{result.channel}</div>
                </div>
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <div className="w-3 h-3 bg-white rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!loading && results.length === 0 && query && !error && (
        <div className="text-center text-white/70 mt-4 py-8">
          <div className="text-lg mb-2">No music found</div>
          <div className="text-sm">Try searching for a different song or artist</div>
        </div>
      )}
      
      {quotaExceeded && (
        <div className="text-center text-white/70 mt-4 py-8">
          <div className="text-lg mb-2">🎵 Explore Trending Songs</div>
          <div className="text-sm">Since search is temporarily unavailable, check out the trending songs below!</div>
        </div>
      )}
    </div>
  );
};

