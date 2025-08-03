"use client";

import React, { useState, useEffect } from "react";
import { YOUTUBE_API_KEY } from "@/app/youtube-search-config";
import { Search, X, Clock, TrendingUp } from "lucide-react";

interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  viewCount?: string;
  likeCount?: string;
  duration?: string;
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
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setError("");
    setResults([]);
    setShowSuggestions(false);
    
    try {
      // First, get search results
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encodeURIComponent(query + ' music song')}&videoCategoryId=10&key=${YOUTUBE_API_KEY}`
      );
      const searchData = await searchRes.json();
      
      if (searchData.error) {
        if (searchData.error.code === 403 && searchData.error.message.includes('quota')) {
          setQuotaExceeded(true);
          onQuotaExceeded?.(true);
          throw new Error("YouTube API quota exceeded. Please try again later or contact support.");
        } else {
          throw new Error(searchData.error.message);
        }
      }
      
      if (!searchData.items || searchData.items.length === 0) {
        setError("No music found for this search. Try a different song or artist.");
        return;
      }

      // Get video IDs for detailed info
      const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
      
      // Fetch detailed video information including statistics
      const detailsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
      );
      const detailsData = await detailsRes.json();
      
      if (detailsData.error) {
        throw new Error(detailsData.error.message);
      }

      // Combine search results with detailed info
      const items = searchData.items.map((item: any) => {
        const details = detailsData.items.find((detail: any) => detail.id === item.id.videoId);
        return {
          videoId: item.id.videoId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails.medium.url,
          viewCount: details?.statistics?.viewCount || '0',
          likeCount: details?.statistics?.likeCount || '0',
          duration: details?.contentDetails?.duration || 'PT0S'
        };
      });
      
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
    if (e.target.value.trim()) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (query.trim()) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => setShowSuggestions(false), 200);
  };

  // Generate search suggestions based on query
  const generateSuggestions = (searchQuery: string) => {
    if (!searchQuery.trim()) return [];
    
    const baseSuggestions = [
      searchQuery,
      `${searchQuery} guitar remix`,
      `${searchQuery} slowed`,
      `${searchQuery} lyrics`,
      `${searchQuery} official video`,
      `${searchQuery} acoustic`,
      `${searchQuery} cover`,
      `${searchQuery} live`
    ];
    
    return baseSuggestions.slice(0, 6);
  };

  // Format view count
  const formatViewCount = (count: string) => {
    const num = parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Format like count
  const formatLikeCount = (count: string) => {
    const num = parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Parse YouTube duration
  const parseDuration = (duration: string) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return '0:00';
    
    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');
    
    let totalMinutes = parseInt(minutes) || 0;
    if (hours) totalMinutes += parseInt(hours) * 60;
    
    const secs = parseInt(seconds) || 0;
    return `${totalMinutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full relative">
      <form onSubmit={handleSearch} className="flex items-center">
        <div className={`flex flex-1 items-center backdrop-blur-lg px-4 py-3 gap-3 focus-within:ring-2 focus-within:ring-blue-400 transition-all border ${
          isFocused && showSuggestions 
            ? 'bg-gray-800/90 border-gray-600/50 rounded-t-2xl border-b-0' 
            : 'bg-gray-900/80 border-gray-700/50 rounded-2xl'
        }`}>
          <Search className="text-gray-400 w-5 h-5" />
          <input
            type="text"
            className="flex-1 bg-transparent outline-none text-white placeholder:text-gray-400 text-base font-medium"
            placeholder="Search for songs, artists, or albums..."
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Search Suggestions Dropdown */}
      {isFocused && showSuggestions && (
        <div className="absolute top-full left-0 right-0 bg-gray-800/90 backdrop-blur-lg rounded-b-2xl border border-gray-600/50 shadow-2xl z-50 max-h-96 overflow-y-auto border-t-0">
          {/* Search Suggestions */}
          <div className="p-2">
            <div className="text-gray-400 text-xs font-medium px-3 py-2">Search suggestions</div>
            {generateSuggestions(query).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  setQuery(suggestion);
                  setShowSuggestions(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-gray-700/50 rounded-md transition-colors"
              >
                <Search className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{suggestion}</span>
              </button>
            ))}
          </div>
          
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="border-t border-gray-600/50 p-2">
              <div className="text-gray-400 text-xs font-medium px-3 py-2">Recent searches</div>
              {recentSearches.slice(0, 3).map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(search);
                    setShowSuggestions(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-gray-700/50 rounded-md transition-colors"
                >
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{search}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center text-white mt-4 py-8">
          <div className="inline-block w-8 h-8 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin mb-2"></div>
          <div className="text-gray-300">Searching for music...</div>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-xl">Songs</h3>
            <span className="text-gray-300 text-sm">{results.length} songs found</span>
          </div>
          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={result.videoId}
                className="flex items-center gap-4 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg cursor-pointer transition-all group"
                onClick={() => onSelect(result)}
              >
                {/* Album Art */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                  <img 
                    src={result.thumbnail} 
                    alt={result.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                
                {/* Song Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate text-lg">{result.title}</div>
                  <div className="text-white/70 text-sm truncate">
                    {result.channel} • {parseDuration(result.duration || 'PT0S')} • {formatViewCount(result.viewCount || '0')} views
                  </div>
                </div>
                
                {/* Play Button */}
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <div className="w-3 h-3 bg-white rounded"></div>
                </div>
              </div>
            ))}
            
            {/* Show All Button */}
            {results.length > 3 && (
              <button className="w-full mt-4 px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors">
                Show all
              </button>
            )}
          </div>
        </div>
      )}
      
      {quotaExceeded && (
        <div className="text-center text-gray-400 mt-4 py-8">
          <div className="text-lg mb-2">🎵 Explore Trending Songs</div>
          <div className="text-sm">Since search is temporarily unavailable, check out the trending songs below!</div>
        </div>
      )}
    </div>
  );
};

