'use client';

import React, { useEffect, useState } from "react";
import { FluidGradient } from "@/components/ui/fluid-gradient";
import { YouTubeSearchBar } from "@/components/ui/YouTubeSearchBar";
import { AudioPlayer } from "@/components/ui/AudioPlayer";
import { RelatedVideos } from "@/components/ui/RelatedVideos";

const TYPING_TEXT = "Dev's Music App";

export default function Home() {
  const [show, setShow] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);
  const [trendingSongs, setTrendingSongs] = useState<any[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [featuredPlaylists, setFeaturedPlaylists] = useState<any[]>([]);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    setShow(false);
    const timeout = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  const handleVideoSelect = (result: any) => {
    setSelectedVideo(result);
    setRelatedVideos([]); // Clear previous related videos
  };

  const handleRelatedVideosFetched = (videos: any[]) => {
    setRelatedVideos(videos);
  };

  const handleRelatedVideoSelect = (video: any) => {
    setSelectedVideo(video);
    setRelatedVideos([]); // Clear related videos when a new video is selected
  };

  // Fetch trending songs for the home page
  const fetchTrendingSongs = async () => {
    setLoadingTrending(true);
    try {
      const trendingQueries = [
        'trending music 2024',
        'popular songs 2024',
        'top hits 2024',
        'viral songs 2024',
        'chart toppers 2024',
        'best music 2024'
      ];
      
      const allTrendingSongs: any[] = [];
      
      for (const query of trendingQueries.slice(0, 3)) { // Use first 3 queries to avoid rate limiting
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encodeURIComponent(query)}&videoCategoryId=10&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`
        );
        
        if (res.ok) {
          const data = await res.json();
          if (data.error) {
            if (data.error.code === 403 && data.error.message.includes('quota')) {
              setQuotaExceeded(true);
              break; // Stop trying other queries
            }
            continue; // Skip this query if there's an error
          }
          if (data.items && data.items.length > 0) {
            const songs = data.items
              .filter((item: any) => {
                const title = item.snippet.title.toLowerCase();
                // Filter out remixes and covers for trending songs
                const remixKeywords = ['remix', 'cover', 'karaoke', 'instrumental', 'acoustic', 'unplugged'];
                return !remixKeywords.some(keyword => title.includes(keyword));
              })
              .map((item: any) => ({
                videoId: item.id.videoId,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
              }));
            
            allTrendingSongs.push(...songs);
          }
        }
      }
      
      // Remove duplicates and limit to 24 songs
      const uniqueSongs = allTrendingSongs.filter((song, index, self) => 
        index === self.findIndex(s => s.videoId === song.videoId)
      ).slice(0, 24);
      
      setTrendingSongs(uniqueSongs);
      
      // If no trending songs found, show featured playlists
      if (uniqueSongs.length === 0) {
        setQuotaExceeded(true);
      }
    } catch (err) {
      console.error('Error fetching trending songs:', err);
      // If trending songs fail to load, show featured playlists instead
      setQuotaExceeded(true);
    } finally {
      setLoadingTrending(false);
    }
  };

  // Create featured playlists for when quota is exceeded
  const createFeaturedPlaylists = () => {
    const playlists = [
      {
        id: 'pop-hits',
        title: 'Pop Hits 2024',
        description: 'Top pop songs of the year',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
        songs: [
          { videoId: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', channel: 'Rick Astley' },
          { videoId: '9bZkp7q19f0', title: 'PSY - GANGNAM STYLE', channel: 'officialpsy' },
          { videoId: 'kJQP7kiw5Fk', title: 'Luis Fonsi - Despacito ft. Daddy Yankee', channel: 'Luis Fonsi' }
        ]
      },
      {
        id: 'bollywood-classics',
        title: 'Bollywood Classics',
        description: 'Timeless Hindi movie songs',
        thumbnail: 'https://img.youtube.com/vi/8iA5HSdqhXY/mqdefault.jpg',
        songs: [
          { videoId: '8iA5HSdqhXY', title: 'Tum Hi Ho - Aashiqui 2', channel: 'T-Series' },
          { videoId: 'YBHQbu5rbdQ', title: 'Chaiyya Chaiyya - Dil Se', channel: 'Sony Music India' },
          { videoId: 'ZbVG7g_R9j4', title: 'Tere Sang Yaara - Rustom', channel: 'T-Series' }
        ]
      },
      {
        id: 'english-hits',
        title: 'English Hits',
        description: 'Popular English songs',
        thumbnail: 'https://img.youtube.com/vi/09R8_2QJgqA/mqdefault.jpg',
        songs: [
          { videoId: '09R8_2QJgqA', title: 'Adele - Rolling in the Deep', channel: 'Adele' },
          { videoId: 'hT_nvWreIhg', title: 'OneRepublic - Counting Stars', channel: 'OneRepublic' },
          { videoId: 'YykjpeuMNEk', title: 'Hymn for the Weekend - Coldplay', channel: 'Coldplay' }
        ]
      },
      {
        id: 'romantic-ballads',
        title: 'Romantic Ballads',
        description: 'Love songs for every mood',
        thumbnail: 'https://img.youtube.com/vi/8iA5HSdqhXY/mqdefault.jpg',
        songs: [
          { videoId: '8iA5HSdqhXY', title: 'Tum Hi Ho - Aashiqui 2', channel: 'T-Series' },
          { videoId: 'YBHQbu5rbdQ', title: 'Chaiyya Chaiyya - Dil Se', channel: 'Sony Music India' },
          { videoId: 'ZbVG7g_R9j4', title: 'Tere Sang Yaara - Rustom', channel: 'T-Series' }
        ]
      },
      {
        id: 'party-mix',
        title: 'Party Mix',
        description: 'High energy party songs',
        thumbnail: 'https://img.youtube.com/vi/9bZkp7q19f0/mqdefault.jpg',
        songs: [
          { videoId: '9bZkp7q19f0', title: 'PSY - GANGNAM STYLE', channel: 'officialpsy' },
          { videoId: 'kJQP7kiw5Fk', title: 'Luis Fonsi - Despacito ft. Daddy Yankee', channel: 'Luis Fonsi' },
          { videoId: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', channel: 'Rick Astley' }
        ]
      },
      {
        id: 'chill-vibes',
        title: 'Chill Vibes',
        description: 'Relaxing and peaceful songs',
        thumbnail: 'https://img.youtube.com/vi/09R8_2QJgqA/mqdefault.jpg',
        songs: [
          { videoId: '09R8_2QJgqA', title: 'Adele - Rolling in the Deep', channel: 'Adele' },
          { videoId: 'hT_nvWreIhg', title: 'OneRepublic - Counting Stars', channel: 'OneRepublic' },
          { videoId: 'YykjpeuMNEk', title: 'Hymn for the Weekend - Coldplay', channel: 'Coldplay' }
        ]
      }
    ];
    
    setFeaturedPlaylists(playlists);
  };

  // Fetch trending songs on component mount
  useEffect(() => {
    fetchTrendingSongs();
    createFeaturedPlaylists(); // Always create featured playlists as backup
  }, []);

  return (
    <div className="relative min-h-screen w-full">
      {/* Fixed gradient background */}
      <div className="fixed inset-0 w-full h-full overflow-hidden">
        <FluidGradient />
      </div>
      
      {/* YouTube Music-style layout */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left Sidebar */}
        <div className="w-64 bg-black/20 backdrop-blur-lg border-r border-white/10 p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Music App</h1>
            <p className="text-white/70 text-sm">Your personal music companion</p>
          </div>
          
          <nav className="space-y-2">
            <a href="#" className="flex items-center gap-3 text-white hover:bg-white/10 rounded-lg px-3 py-2 transition-colors">
              <div className="w-5 h-5 bg-white rounded-sm"></div>
              <span>Home</span>
            </a>
            <a href="#" className="flex items-center gap-3 text-white/70 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors">
              <div className="w-5 h-5 bg-white/50 rounded-sm"></div>
              <span>Explore</span>
            </a>
            <a href="#" className="flex items-center gap-3 text-white/70 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors">
              <div className="w-5 h-5 bg-white/50 rounded-sm"></div>
              <span>Library</span>
            </a>
          </nav>
          
          <div className="mt-8">
            <button className="w-full bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-2 text-sm transition-colors">
              + New playlist
            </button>
          </div>
          
          <div className="mt-6 space-y-2">
            <div className="text-white/50 text-xs font-medium uppercase tracking-wider">Your Music</div>
            <a href="#" className="flex items-center gap-3 text-white/70 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors">
              <div className="w-5 h-5 bg-red-500 rounded-sm"></div>
              <span>Liked music</span>
            </a>
            <a href="#" className="flex items-center gap-3 text-white/70 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors">
              <div className="w-5 h-5 bg-purple-500 rounded-sm"></div>
              <span>Episodes for later</span>
            </a>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar with Search */}
          <div className="bg-black/10 backdrop-blur-lg border-b border-white/10 p-6">
            <div className="max-w-4xl mx-auto">
              <YouTubeSearchBar 
                onSelect={handleVideoSelect} 
                currentSong={selectedVideo ? {
                  title: selectedVideo.title,
                  channel: selectedVideo.channel
                } : undefined}
                onQuotaExceeded={setQuotaExceeded}
              />
            </div>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
              {/* Welcome Section */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Welcome to Music App</h1>
                <p className="text-white/70">Discover trending songs and create your perfect playlist</p>
              </div>
              
              {/* Quick Actions */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => document.querySelector('input[type="text"]')?.focus()}
                    className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 rounded-lg p-4 text-left transition-all"
                  >
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mb-2">
                      <div className="w-4 h-4 bg-blue-400 rounded"></div>
                    </div>
                    <div className="text-white font-medium">Search Music</div>
                    <div className="text-white/70 text-sm">Find your favorite songs</div>
                  </button>
                  
                  <button
                    onClick={() => fetchTrendingSongs()}
                    className="bg-gradient-to-r from-green-500/20 to-blue-500/20 hover:from-green-500/30 hover:to-blue-500/30 rounded-lg p-4 text-left transition-all"
                  >
                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mb-2">
                      <div className="w-4 h-4 bg-green-400 rounded"></div>
                    </div>
                    <div className="text-white font-medium">Trending Now</div>
                    <div className="text-white/70 text-sm">Discover what's popular</div>
                  </button>
                  
                  <button
                    onClick={() => setQuotaExceeded(!quotaExceeded)}
                    className="bg-gradient-to-r from-pink-500/20 to-red-500/20 hover:from-pink-500/30 hover:to-red-500/30 rounded-lg p-4 text-left transition-all"
                  >
                    <div className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center mb-2">
                      <div className="w-4 h-4 bg-pink-400 rounded"></div>
                    </div>
                    <div className="text-white font-medium">Featured Playlists</div>
                    <div className="text-white/70 text-sm">Curated music collections</div>
                  </button>
                  
                  <button
                    className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 rounded-lg p-4 text-left transition-all"
                  >
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center mb-2">
                      <div className="w-4 h-4 bg-purple-400 rounded"></div>
                    </div>
                    <div className="text-white font-medium">Create Playlist</div>
                    <div className="text-white/70 text-sm">Build your collection</div>
                  </button>
                  
                  <button
                    className="bg-gradient-to-r from-orange-500/20 to-red-500/20 hover:from-orange-500/30 hover:to-red-500/30 rounded-lg p-4 text-left transition-all"
                  >
                    <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center mb-2">
                      <div className="w-4 h-4 bg-orange-400 rounded"></div>
                    </div>
                    <div className="text-white font-medium">Random Mix</div>
                    <div className="text-white/70 text-sm">Surprise me</div>
                  </button>
                </div>
              </div>
              
              {/* Mood Filters */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">Mood & Activity</h3>
                <div className="flex gap-3 flex-wrap">
                  {['Party', 'Sad', 'Sleep', 'Commute', 'Work out', 'Focus'].map((mood) => (
                    <button
                      key={mood}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm transition-colors"
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Current Player */}
              {selectedVideo && (
                <div className="mb-8">
                  <AudioPlayer 
                    videoId={selectedVideo.videoId}
                    title={selectedVideo.title}
                    channel={selectedVideo.channel}
                    onRelatedVideosFetched={handleRelatedVideosFetched}
                  />
                </div>
              )}
              
              {/* Trending Songs Section */}
              {!selectedVideo && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">
                      {quotaExceeded ? 'Featured Playlists' : 'Trending Songs'}
                    </h2>
                    {loadingTrending && !quotaExceeded && (
                      <div className="text-white/70 text-sm">Loading trending songs...</div>
                    )}
                    {quotaExceeded && (
                      <div className="text-white/70 text-sm">🎵 Curated for you</div>
                    )}
                  </div>
                  
                  {quotaExceeded && featuredPlaylists.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                      {featuredPlaylists.map((playlist) => (
                        <div
                          key={playlist.id}
                          onClick={() => handleVideoSelect(playlist.songs[0])}
                          className="bg-white/5 hover:bg-white/10 rounded-lg p-3 cursor-pointer transition-all group"
                        >
                          <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-800">
                            <img 
                              src={playlist.thumbnail} 
                              alt={playlist.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div className="text-white text-sm font-medium truncate">{playlist.title}</div>
                          <div className="text-white/70 text-xs truncate">{playlist.description}</div>
                        </div>
                      ))}
                    </div>
                  ) : trendingSongs.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                      {trendingSongs.map((song) => (
                        <div
                          key={song.videoId}
                          onClick={() => handleVideoSelect(song)}
                          className="bg-white/5 hover:bg-white/10 rounded-lg p-3 cursor-pointer transition-all group"
                        >
                          <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-800">
                            {song.thumbnail ? (
                              <img 
                                src={song.thumbnail} 
                                alt={song.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                  <div className="w-4 h-4 bg-blue-400 rounded"></div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="text-white text-sm font-medium truncate">{song.title}</div>
                          <div className="text-white/70 text-xs truncate">{song.channel}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  
                  {!loadingTrending && trendingSongs.length === 0 && !quotaExceeded && (
                    <div className="text-center py-8">
                      <div className="text-white/50 text-sm">No trending songs available</div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Related Videos Grid */}
              {relatedVideos.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-white mb-4">Related Songs</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {relatedVideos
                      .filter(video => video.videoId !== selectedVideo?.videoId)
                      .slice(0, 12)
                      .map((video) => (
                        <div
                          key={video.videoId}
                          onClick={() => handleRelatedVideoSelect(video)}
                          className="bg-white/5 hover:bg-white/10 rounded-lg p-3 cursor-pointer transition-all group"
                        >
                          <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-800">
                            {video.thumbnail ? (
                              <img 
                                src={video.thumbnail} 
                                alt={video.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                  <div className="w-4 h-4 bg-blue-400 rounded"></div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="text-white text-sm font-medium truncate">{video.title}</div>
                          <div className="text-white/70 text-xs truncate">{video.channel}</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              
              {/* Recently Played Section */}
              {selectedVideo && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-white mb-4">Recently Played</h2>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                        <img 
                          src={`https://img.youtube.com/vi/${selectedVideo.videoId}/mqdefault.jpg`}
                          alt={selectedVideo.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold truncate">{selectedVideo.title}</div>
                        <div className="text-white/70 text-sm truncate">{selectedVideo.channel}</div>
                      </div>
                      <button
                        onClick={() => setSelectedVideo(null)}
                        className="text-white/70 hover:text-white transition-colors"
                      >
                        <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded"></div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Featured Playlists */}
              <div>
                <h2 className="text-xl font-bold text-white mb-4">Featured playlists for you</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white/5 hover:bg-white/10 rounded-lg p-3 cursor-pointer transition-all">
                      <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                          <div className="w-6 h-6 bg-white rounded"></div>
                        </div>
                      </div>
                      <div className="text-white/70 text-sm">Playlist {i + 1}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
