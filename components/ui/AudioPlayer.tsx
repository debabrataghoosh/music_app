"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, RotateCcw } from "lucide-react";
import { YOUTUBE_API_KEY } from "@/app/youtube-search-config";

interface AudioPlayerProps {
  videoId: string;
  title: string;
  channel: string;
  onNext?: (video: any) => void;
  onPrevious?: () => void;
}

interface RelatedVideo {
  videoId: string;
  title: string;
  channel: string;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  videoId, 
  title, 
  channel, 
  onNext, 
  onPrevious 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState<RelatedVideo[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [currentVideoTitle, setCurrentVideoTitle] = useState(title);
  const [currentVideoChannel, setCurrentVideoChannel] = useState(channel);
  const [isLoading, setIsLoading] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
  const [shuffleMode, setShuffleMode] = useState(false);
  const [loopMode, setLoopMode] = useState(false);
  const [originalPlaylist, setOriginalPlaylist] = useState<RelatedVideo[]>([]);
  const playerRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch related videos from YouTube
  const fetchRelatedVideos = async (videoId: string) => {
    try {
      console.log('Fetching related videos for:', videoId);
      
      // Check if API key is available
      if (!YOUTUBE_API_KEY) {
        console.error('YouTube API key is missing');
        createFallbackPlaylist(videoId);
        return;
      }

      // Validate video ID format
      if (!videoId || videoId.length < 10) {
        console.error('Invalid video ID:', videoId);
        createFallbackPlaylist(videoId);
        return;
      }

      // Test API key first with a simple search
      const testUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=music&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
      console.log('Testing API key with:', testUrl);
      
      const testRes = await fetch(testUrl);
      console.log('Test API Response status:', testRes.status);
      
      if (!testRes.ok) {
        const testErrorText = await testRes.text();
        console.error('API key test failed:', testRes.status, testErrorText);
        createFallbackPlaylist(videoId);
        return;
      }

      // Use search API instead of relatedToVideoId for better compatibility
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(currentVideoTitle)}&key=${YOUTUBE_API_KEY}`;
      console.log('API URL:', url);
      
      const res = await fetch(url);
      console.log('API Response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('API Response data:', data);
        
        if (data.items && data.items.length > 0) {
          // Filter out the current video and create playlist
          const videos = data.items
            .filter((item: any) => item.id.videoId !== videoId) // Exclude current video
            .map((item: any) => ({
              videoId: item.id.videoId,
              title: item.snippet.title,
              channel: item.snippet.channelTitle,
            }));
          
          console.log('Related videos fetched:', videos.length);
          
          if (videos.length > 0) {
            setRelatedVideos(videos);
            setOriginalPlaylist(videos); // Store original playlist for shuffle
            
            // If video has ended and we now have related videos, play next
            if (isVideoEnded && videos.length > 0) {
              setTimeout(() => playNextSong(), 1000);
            }
          } else {
            // Try generic music search as fallback
            console.log('No related videos found, trying generic music search...');
            await fetchGenericMusicVideos();
          }
        } else {
          // Try generic music search as fallback
          console.log('No related videos found, trying generic music search...');
          await fetchGenericMusicVideos();
        }
      } else {
        const errorText = await res.text();
        console.error('Failed to fetch related videos:', res.status, errorText);
        // Try generic music search as fallback
        await fetchGenericMusicVideos();
      }
    } catch (err) {
      console.error('Error fetching related videos:', err);
      createFallbackPlaylist(videoId);
    }
  };

  // Fallback function to fetch generic music videos
  const fetchGenericMusicVideos = async () => {
    try {
      const fallbackUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=music&key=${YOUTUBE_API_KEY}`;
      console.log('Trying fallback search:', fallbackUrl);
      
      const fallbackRes = await fetch(fallbackUrl);
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (fallbackData.items && fallbackData.items.length > 0) {
          const videos = fallbackData.items
            .filter((item: any) => item.id.videoId !== videoId)
            .map((item: any) => ({
              videoId: item.id.videoId,
              title: item.snippet.title,
              channel: item.snippet.channelTitle,
            }));
          
          if (videos.length > 0) {
            console.log('Fallback videos fetched:', videos.length);
            setRelatedVideos(videos);
            setOriginalPlaylist(videos);
          } else {
            createFallbackPlaylist(videoId);
          }
        } else {
          createFallbackPlaylist(videoId);
        }
      } else {
        createFallbackPlaylist(videoId);
      }
    } catch (err) {
      console.error('Fallback search failed:', err);
      createFallbackPlaylist(videoId);
    }
  };

  // Helper function to create fallback playlist
  const createFallbackPlaylist = (videoId: string) => {
    const singleVideo = {
      videoId: videoId,
      title: currentVideoTitle,
      channel: currentVideoChannel,
    };
    setRelatedVideos([singleVideo]);
    setOriginalPlaylist([singleVideo]);
    console.log('Created fallback playlist with current video');
  };

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player(iframeRef.current, {
        height: '0',
        width: '0',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          fs: 0,
          disablekb: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            console.log('Player ready, duration:', event.target.getDuration());
            setIsPlaying(true);
            setDuration(event.target.getDuration());
            setIsVideoEnded(false);
            // Fetch related videos when player is ready
            fetchRelatedVideos(videoId);
          },
          onStateChange: (event: any) => {
            console.log('Player state changed:', event.data);
            // YouTube states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
            setIsPlaying(event.data === 1);
            
            // Auto-play next song when current song ends
            if (event.data === 0) {
              console.log('Video ended, checking for autoplay...');
              setIsVideoEnded(true);
              
              // If we already have related videos, play next immediately
              if (relatedVideos.length > 0) {
                setTimeout(() => playNextSong(), 1000);
              } else {
                // If we don't have related videos yet, fetch them first
                fetchRelatedVideos(videoId);
              }
            }
          }
        }
      });
    };

    // If API is already loaded
    if (window.YT && window.YT.Player) {
      window.onYouTubeIframeAPIReady();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoId]);

  // Update current time
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && isPlaying && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const time = playerRef.current.getCurrentTime();
          setCurrentTime(time);
        } catch (error) {
          console.log('Error getting current time:', error);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Handle video ended state when related videos are loaded
  useEffect(() => {
    if (isVideoEnded && relatedVideos.length > 0) {
      console.log('Video ended and related videos available, playing next...');
      setTimeout(() => playNextSong(), 1000);
    }
  }, [isVideoEnded, relatedVideos.length]);

  // Update current video info when props change
  useEffect(() => {
    setCurrentVideoTitle(title);
    setCurrentVideoChannel(channel);
  }, [title, channel]);

  // Trigger fetch related videos when loop mode is enabled and no videos are available
  useEffect(() => {
    if (loopMode && relatedVideos.length === 0 && videoId) {
      console.log('Loop mode enabled but no videos available, fetching related videos...');
      fetchRelatedVideos(videoId);
    }
  }, [loopMode, relatedVideos.length, videoId]);

  // Create fallback playlist when component loads if no videos are available
  useEffect(() => {
    if (relatedVideos.length === 0 && videoId && currentVideoTitle && currentVideoChannel) {
      console.log('No videos available, creating fallback playlist...');
      createFallbackPlaylist(videoId);
    }
  }, [videoId, currentVideoTitle, currentVideoChannel, relatedVideos.length]);

  // Helper function to check if player is ready
  const isPlayerReady = () => {
    return playerRef.current && 
           typeof playerRef.current.getCurrentTime === 'function' &&
           typeof playerRef.current.playVideo === 'function' &&
           typeof playerRef.current.pauseVideo === 'function';
  };

  // Toggle repeat mode: none -> one -> all -> none
  const toggleRepeatMode = () => {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
    console.log('Repeat mode changed to:', modes[nextIndex]);
  };

  // Toggle shuffle mode
  const toggleShuffleMode = () => {
    setShuffleMode(!shuffleMode);
    if (!shuffleMode && originalPlaylist.length > 0) {
      // Enable shuffle - create shuffled playlist
      const shuffled = [...originalPlaylist].sort(() => Math.random() - 0.5);
      setRelatedVideos(shuffled);
      setCurrentVideoIndex(0);
      console.log('Shuffle enabled');
    } else if (shuffleMode && originalPlaylist.length > 0) {
      // Disable shuffle - restore original playlist
      setRelatedVideos(originalPlaylist);
      // Find current video in original playlist
      const currentVideo = relatedVideos[currentVideoIndex];
      const originalIndex = originalPlaylist.findIndex(v => v.videoId === currentVideo?.videoId);
      setCurrentVideoIndex(originalIndex >= 0 ? originalIndex : 0);
      console.log('Shuffle disabled');
    }
  };

  // Toggle loop mode
  const toggleLoopMode = () => {
    setLoopMode(!loopMode);
    console.log('Loop mode:', !loopMode);
  };

  const playNextSong = () => {
    if (relatedVideos.length > 0) {
      setIsLoading(true);
      
      let nextIndex = currentVideoIndex;
      
      // Handle repeat one mode
      if (repeatMode === 'one') {
        // Stay on same song
        nextIndex = currentVideoIndex;
      } else {
        // Normal next logic
        nextIndex = (currentVideoIndex + 1) % relatedVideos.length;
        
        // Handle loop mode - if at end and loop is enabled, start over
        if (nextIndex === 0 && !loopMode && repeatMode !== 'all') {
          console.log('Reached end of playlist, stopping');
          setIsLoading(false);
          return;
        }
      }
      
      const nextVideo = relatedVideos[nextIndex];
      console.log('Playing next song:', nextVideo.title, 'Video ID:', nextVideo.videoId);
      setCurrentVideoIndex(nextIndex);
      setIsVideoEnded(false);
      setCurrentTime(0);
      setCurrentVideoTitle(nextVideo.title);
      setCurrentVideoChannel(nextVideo.channel);
      
      if (onNext) {
        onNext(nextVideo);
        setIsLoading(false);
      } else {
        // Destroy current player and create new one with next video
        if (playerRef.current) {
          try {
            console.log('Destroying current player and loading next video...');
            playerRef.current.destroy();
            
            // Create new player with next video
            setTimeout(() => {
              if (iframeRef.current) {
                playerRef.current = new window.YT.Player(iframeRef.current, {
                  height: '0',
                  width: '0',
                  videoId: nextVideo.videoId,
                  playerVars: {
                    autoplay: 1,
                    controls: 0,
                    modestbranding: 1,
                    rel: 0,
                    showinfo: 0,
                    iv_load_policy: 3,
                    cc_load_policy: 0,
                    fs: 0,
                    disablekb: 1,
                    playsinline: 1,
                    enablejsapi: 1,
                    origin: window.location.origin
                  },
                  events: {
                    onReady: (event: any) => {
                      console.log('Next video player ready');
                      setIsPlaying(true);
                      setDuration(event.target.getDuration());
                      setIsLoading(false);
                      // Don't fetch related videos again to avoid infinite loop
                    },
                    onStateChange: (event: any) => {
                      setIsPlaying(event.data === 1);
                      if (event.data === 0) {
                        setIsVideoEnded(true);
                        // Auto-play next when this one ends (handled by useEffect)
                        setTimeout(() => playNextSong(), 1000);
                      }
                    }
                  }
                });
              }
            }, 100);
            
            console.log('Created new player for next video:', nextVideo.videoId);
          } catch (error) {
            console.error('Error creating new player for next video:', error);
            setIsLoading(false);
          }
        } else {
          console.error('Player not ready');
          setIsLoading(false);
        }
      }
    } else {
      console.log('No related videos available for next song');
    }
  };

  const playPreviousSong = () => {
    if (relatedVideos.length > 0) {
      setIsLoading(true);
      
      let prevIndex = currentVideoIndex;
      
      // Handle repeat one mode
      if (repeatMode === 'one') {
        // Stay on same song
        prevIndex = currentVideoIndex;
      } else {
        // Normal previous logic
        prevIndex = currentVideoIndex > 0 ? currentVideoIndex - 1 : relatedVideos.length - 1;
        
        // Handle loop mode - if at beginning and loop is enabled, go to end
        if (prevIndex === relatedVideos.length - 1 && !loopMode && repeatMode !== 'all') {
          console.log('Reached beginning of playlist, stopping');
          setIsLoading(false);
          return;
        }
      }
      
      const prevVideo = relatedVideos[prevIndex];
      console.log('Playing previous song:', prevVideo.title, 'Video ID:', prevVideo.videoId);
      setCurrentVideoIndex(prevIndex);
      setIsVideoEnded(false);
      setCurrentTime(0);
      setCurrentVideoTitle(prevVideo.title);
      setCurrentVideoChannel(prevVideo.channel);
      
      if (onPrevious) {
        onPrevious();
      } else {
        // Destroy current player and create new one with previous video
        if (playerRef.current) {
          try {
            console.log('Destroying current player and loading previous video...');
            playerRef.current.destroy();
            
            // Create new player with previous video
            setTimeout(() => {
              if (iframeRef.current) {
                playerRef.current = new window.YT.Player(iframeRef.current, {
                  height: '0',
                  width: '0',
                  videoId: prevVideo.videoId,
                  playerVars: {
                    autoplay: 1,
                    controls: 0,
                    modestbranding: 1,
                    rel: 0,
                    showinfo: 0,
                    iv_load_policy: 3,
                    cc_load_policy: 0,
                    fs: 0,
                    disablekb: 1,
                    playsinline: 1,
                    enablejsapi: 1,
                    origin: window.location.origin
                  },
                  events: {
                    onReady: (event: any) => {
                      console.log('Previous video player ready');
                      setIsPlaying(true);
                      setDuration(event.target.getDuration());
                      setIsLoading(false);
                    },
                    onStateChange: (event: any) => {
                      setIsPlaying(event.data === 1);
                      if (event.data === 0) {
                        setIsVideoEnded(true);
                        // Auto-play next when this one ends
                        setTimeout(() => playNextSong(), 1000);
                      }
                    }
                  }
                });
              }
            }, 100);
            
            console.log('Created new player for previous video:', prevVideo.videoId);
          } catch (error) {
            console.error('Error creating new player for previous video:', error);
            setIsLoading(false);
          }
        } else {
          console.error('Player not ready');
          setIsLoading(false);
        }
      }
    } else {
      console.log('No related videos available for previous song');
    }
  };

  const togglePlayPause = () => {
    if (isPlayerReady()) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    } else {
      console.log('Player not ready for play/pause');
      // If player is not ready, try to initialize it
      if (videoId && iframeRef.current) {
        console.log('Attempting to initialize player...');
        if (window.YT && window.YT.Player) {
          window.onYouTubeIframeAPIReady();
        }
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    
    if (isPlayerReady()) {
      playerRef.current.setVolume(newVolume * 100);
    }
  };

  const toggleMute = () => {
    if (isPlayerReady()) {
      if (isMuted) {
        playerRef.current.unMute();
        setVolume(1);
      } else {
        playerRef.current.mute();
        setVolume(0);
      }
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    
    if (isPlayerReady()) {
      playerRef.current.seekTo(newTime, true);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-black/40 border border-white/20 backdrop-blur-lg rounded-2xl shadow-2xl p-6">
      {/* Hidden YouTube iframe */}
      <div ref={iframeRef} className="hidden" />

      {/* Track Info */}
      <div className="text-center mb-6">
        <h3 className="text-white text-lg font-semibold mb-1">{currentVideoTitle}</h3>
        <p className="text-white/70 text-sm">{currentVideoChannel}</p>
        
        {/* Mode Status */}
        <div className="flex items-center justify-center gap-2 mt-2">
          {repeatMode !== 'none' && (
            <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full">
              {repeatMode === 'one' ? '🔂 Repeat One' : '🔁 Repeat All'}
            </span>
          )}
          {shuffleMode && (
            <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full">
              🔀 Shuffle
            </span>
          )}
          {loopMode && (
            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded-full">
              🔄 Loop
            </span>
          )}
        </div>
        
        {relatedVideos.length > 0 && (
          <p className="text-white/50 text-xs mt-1">
            🎵 Auto-play enabled • {relatedVideos.length} related songs
          </p>
        )}
        {relatedVideos.length === 0 && !isVideoEnded && (
          <p className="text-white/50 text-xs mt-1">
            ⏳ Loading related songs...
          </p>
        )}
        {relatedVideos.length === 0 && isVideoEnded && !loopMode && (
          <p className="text-yellow-400 text-xs mt-1">
            ⚠️ Auto-play paused - no related songs found
          </p>
        )}
        {relatedVideos.length === 0 && isVideoEnded && loopMode && (
          <p className="text-green-400 text-xs mt-1">
            🔄 Loop mode active - current song will repeat
          </p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-white/70 text-xs mb-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleProgressChange}
          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-4">
        {/* Mode Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleRepeatMode}
            className={`p-2 transition-colors ${
              repeatMode === 'none' 
                ? 'text-white/30' 
                : repeatMode === 'one'
                ? 'text-blue-400'
                : 'text-green-400'
            } hover:text-white`}
            title={`Repeat: ${repeatMode === 'none' ? 'Off' : repeatMode === 'one' ? 'One' : 'All'}`}
          >
            <Repeat className="w-5 h-5" />
          </button>
          
          <button
            onClick={toggleShuffleMode}
            className={`p-2 transition-colors ${
              shuffleMode ? 'text-blue-400' : 'text-white/30'
            } hover:text-white`}
            title={`Shuffle: ${shuffleMode ? 'On' : 'Off'}`}
          >
            <Shuffle className="w-5 h-5" />
          </button>
          
          <button
            onClick={toggleLoopMode}
            className={`p-2 transition-colors ${
              loopMode ? 'text-green-400' : 'text-white/30'
            } hover:text-white`}
            title={`Loop: ${loopMode ? 'On' : 'Off'}`}
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
        
        {/* Playback Controls */}
        <button
          onClick={() => {
            console.log('Previous button clicked!');
            console.log('Related videos:', relatedVideos);
            console.log('Current index:', currentVideoIndex);
            if (!isLoading) {
              playPreviousSong();
            }
          }}
          className={`p-2 transition-colors ${
            isLoading 
              ? 'text-white/30 cursor-not-allowed' 
              : 'text-white/70 hover:text-white'
          }`}
          disabled={relatedVideos.length === 0 || isLoading}
        >
          <SkipBack className="w-6 h-6" />
        </button>
        
        <button
          onClick={togglePlayPause}
          className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
        >
          {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
        </button>
        
        <button
          onClick={() => {
            console.log('Next button clicked!');
            console.log('Related videos:', relatedVideos);
            console.log('Current index:', currentVideoIndex);
            if (!isLoading) {
              playNextSong();
            }
          }}
          className={`p-2 transition-colors ${
            isLoading 
              ? 'text-white/30 cursor-not-allowed' 
              : 'text-white/70 hover:text-white'
          }`}
          disabled={relatedVideos.length === 0 || isLoading}
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <SkipForward className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={toggleMute}
          className="text-white/70 hover:text-white transition-colors"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-24 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};