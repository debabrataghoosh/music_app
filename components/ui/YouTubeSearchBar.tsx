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
}

export const YouTubeSearchBar: React.FC<YouTubeSearchBarProps> = ({ onSelect }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Fetch YouTube search suggestions
  const fetchSuggestions = async (searchTerm: string) => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoadingSuggestions(true);
    try {
      // Use YouTube Data API search to get video titles as suggestions
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(searchTerm)}&key=${YOUTUBE_API_KEY}`
      );
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        const titles = data.items.map((item: any) => item.snippet.title);
        setSuggestions(titles);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Debounced search suggestions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        fetchSuggestions(query);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    // Add to recent searches
    if (!recentSearches.includes(query)) {
      setRecentSearches(prev => [query, ...prev.slice(0, 4)]);
    }
    
    setLoading(true);
    setError("");
    setResults([]);
    setShowSuggestions(false);
    
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const items = data.items.map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium.url,
      }));
      setResults(items);
    } catch (err: any) {
      setError(err.message || "Failed to fetch results");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setError("");
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    // Auto-search when suggestion is clicked
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
    }, 100);
  };

  const handleInputFocus = () => {
    if (query.trim() || recentSearches.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (e.target.value.trim() || recentSearches.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto my-4 relative">
      <form
        onSubmit={handleSearch}
        className="flex items-center justify-center"
      >
        <div className="flex flex-1 items-center rounded-2xl bg-black/40 border border-white/20 backdrop-blur-lg shadow-2xl px-6 py-3 gap-2 focus-within:ring-2 focus-within:ring-blue-400 transition-all">
          <Search className="text-white w-5 h-5 mr-2" />
          <input
            type="text"
            className="flex-1 bg-transparent outline-none text-white placeholder:text-white/70 text-lg font-medium"
            placeholder="Search YouTube for music..."
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="text-white/70 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <button
            type="submit"
            className="ml-2 px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold text-lg shadow hover:bg-blue-700 transition-all"
          >
            Search
          </button>
        </div>
      </form>

      {/* Search Suggestions */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-black/40 border border-white/20 backdrop-blur-lg rounded-2xl shadow-2xl z-20">
          {/* Recent Searches */}
          {recentSearches.length > 0 && !query && (
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-2 mb-3 text-white/70">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Recent searches</span>
              </div>
              <div className="space-y-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(search)}
                    className="w-full text-left text-white hover:bg-white/10 rounded-lg px-3 py-2 transition-colors"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* YouTube Suggestions */}
          {query && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3 text-white/70">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {loadingSuggestions ? "Loading suggestions..." : "YouTube suggestions"}
                </span>
              </div>
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left text-white hover:bg-white/10 rounded-lg px-3 py-2 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
                {suggestions.length === 0 && !loadingSuggestions && query.length >= 2 && (
                  <div className="text-white/50 text-sm px-3 py-2">
                    No suggestions found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {loading && <div className="text-center text-white mt-2">Searching...</div>}
      {error && <div className="text-red-300 text-center mb-2 mt-2">{error}</div>}
      <ul className="space-y-2 mt-4">
        {results.map(result => (
          <li
            key={result.videoId}
            className="flex items-center gap-4 p-2 bg-black/40 border border-white/10 rounded-xl shadow-md cursor-pointer hover:bg-blue-900/40 backdrop-blur-lg"
            onClick={() => onSelect(result)}
          >
            <img src={result.thumbnail} alt={result.title} className="w-20 h-12 object-cover rounded" />
            <div>
              <div className="font-semibold text-white">{result.title}</div>
              <div className="text-sm text-white/70">{result.channel}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}; 