"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, RotateCcw, Music, ThumbsUp, ThumbsDown, MoreVertical, ChevronDown } from "lucide-react";
import { YOUTUBE_API_KEY } from "@/app/youtube-search-config";

interface AudioPlayerProps {
  videoId: string;
  title: string;
  channel: string;
  viewCount?: string;
  likeCount?: string;
  onNext?: (video: any) => void;
  onPrevious?: () => void;
  onRelatedVideosFetched?: (videos: RelatedVideo[]) => void;
}

interface RelatedVideo {
  videoId: string;
  title: string;
  channel: string;
  thumbnail?: string;
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
  viewCount = '0',
  likeCount = '0',
  onNext, 
  onPrevious,
  onRelatedVideosFetched
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
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const playerRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Extract key search terms from video title for better related video search
  const extractSearchTerms = (title: string): string[] => {
    // Remove common words that don't help with search
    const stopWords = ['official', 'video', 'audio', 'lyrics', 'song', 'music', 'ft', 'feat', 'featuring', 'remix', 'cover', 'live', 'version', 'hq', 'hd', '4k', '1080p', '720p'];
    
    // Clean the title
    let cleanTitle = title.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
    
    // Split into words and filter out stop words
    const words = cleanTitle.split(' ')
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 4); // Take first 4 meaningful words
    
    // If we don't have enough words, add some generic music terms
    if (words.length < 2) {
      words.push('music', 'song');
    }
    
    return words;
  };

  // Filter videos to ensure they are music content and diverse
  const isMusicVideo = (title: string, channel: string, currentTitle?: string): boolean => {
    const titleLower = title.toLowerCase();
    const channelLower = channel.toLowerCase();
    const currentTitleLower = currentTitle?.toLowerCase() || '';
    
    // Keywords that indicate music content
    const musicKeywords = [
      'music', 'song', 'audio', 'lyrics', 'official', 'music video', 'mv', 'track',
      'album', 'single', 'release', 'feat', 'featuring', 'ft', 'cover',
      'live', 'concert', 'performance', 'studio', 'recording'
    ];
    
    // Keywords that indicate non-music content (to exclude)
    const nonMusicKeywords = [
      'tutorial', 'how to', 'review', 'news', 'interview', 'podcast', 'vlog',
      'gaming', 'gameplay', 'walkthrough', 'guide', 'tips', 'tricks',
      'cooking', 'recipe', 'food', 'travel', 'vlog', 'daily', 'life',
      'comedy', 'sketch', 'prank', 'challenge', 'reaction'
    ];
    
    // Keywords that indicate remixes/variations (to exclude for diversity)
    const remixKeywords = [
      'remix', 'remix zone', 'dance remix', 'party remix', 'club remix',
      'mashup', 'mash up', 'mix', 'dance mix', 'party mix',
      'cover', 'cover song', 'cover version', 'karaoke', 'instrumental',
      'acoustic', 'unplugged', 'live version', 'live performance',
      'dance', 'dance song', 'dance music', 'party song', 'party music'
    ];
    
    // Check if title contains music keywords
    const hasMusicKeywords = musicKeywords.some(keyword => 
      titleLower.includes(keyword)
    );
    
    // Check if title contains non-music keywords
    const hasNonMusicKeywords = nonMusicKeywords.some(keyword => 
      titleLower.includes(keyword)
    );
    
    // Check if title contains remix/variation keywords
    const hasRemixKeywords = remixKeywords.some(keyword => 
      titleLower.includes(keyword)
    );
    
    // Check if it's too similar to current song (exclude variations of same song)
    const isSimilarToCurrent = currentTitleLower && (
      titleLower.includes(currentTitleLower.split(' ')[0]) && 
      titleLower.includes(currentTitleLower.split(' ')[1])
    );
    
    // Check if channel name suggests music content
    const isMusicChannel = musicKeywords.some(keyword => 
      channelLower.includes(keyword)
    );
    
    // Return true if it's likely music content, not remix, and different from current
    return hasMusicKeywords && !hasNonMusicKeywords && !hasRemixKeywords && !isSimilarToCurrent;
  };

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

      // Create a more diverse search query by extracting key terms from the title
      const searchTerms = extractSearchTerms(currentVideoTitle);
      const searchQuery = searchTerms.join(' ');
      
      // Try multiple search strategies focused on diverse music content
      const searchStrategies = [
        // Strategy 1: Search by artist/channel for different songs
        currentVideoChannel !== 'Unknown' ? 
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encodeURIComponent(currentVideoChannel + ' official music')}&videoCategoryId=10&key=${YOUTUBE_API_KEY}` : null,
        // Strategy 2: Search by genre/style based on title
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encodeURIComponent(searchQuery + ' official music song')}&videoCategoryId=10&key=${YOUTUBE_API_KEY}`,
        // Strategy 3: Search for popular music in similar style
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=popular music 2024 official&videoCategoryId=10&key=${YOUTUBE_API_KEY}`,
        // Strategy 4: Search for trending music
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=trending music official&videoCategoryId=10&key=${YOUTUBE_API_KEY}`
      ].filter(Boolean);
      
      // Try each strategy and combine results
      const allVideos: any[] = [];
      
      for (const url of searchStrategies) {
        if (!url) continue; // Skip null URLs
        try {
          console.log('Trying search strategy:', url);
          const res = await fetch(url);
          
          if (res.ok) {
            const data = await res.json();
            if (data.items && data.items.length > 0) {
              const videos = data.items
                .filter((item: any) => item.id.videoId !== videoId)
                .filter((item: any) => isMusicVideo(item.snippet.title, item.snippet.channelTitle, currentVideoTitle))
                .map((item: any) => ({
                  videoId: item.id.videoId,
                  title: item.snippet.title,
                  channel: item.snippet.channelTitle,
                  thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
                }));
              
              allVideos.push(...videos);
            }
          }
        } catch (err) {
          console.error('Search strategy failed:', err);
        }
      }
      
      // Remove duplicates and limit results
      const uniqueVideos = allVideos.filter((video, index, self) => 
        index === self.findIndex(v => v.videoId === video.videoId)
      ).slice(0, 15);
      
      console.log('Combined videos found:', uniqueVideos.length);
      
      if (uniqueVideos.length > 0) {
        setRelatedVideos(uniqueVideos);
        setOriginalPlaylist(uniqueVideos);
        
        // Notify parent component about related videos
        if (onRelatedVideosFetched) {
          onRelatedVideosFetched(uniqueVideos);
        }
        
        // If video has ended and we now have related videos, play next
        if (isVideoEnded && uniqueVideos.length > 0) {
          setTimeout(() => playNextSong(), 1000);
        }
      } else {
        // Try generic music search as fallback
        console.log('No related videos found, trying generic music search...');
        await fetchGenericMusicVideos();
      }
      
      return; // Exit early since we handled the response in the loop above
      
      // This code is no longer needed since we handle the response in the loop above
    } catch (err) {
      console.error('Error fetching related videos:', err);
      createFallbackPlaylist(videoId);
    }
  };

  // Fallback function to fetch generic music videos
  const fetchGenericMusicVideos = async () => {
    try {
      // Try multiple diverse music searches for better variety
      const musicQueries = [
        'popular music 2024 official',
        'trending music official',
        'top hits official music',
        'official music videos 2024',
        'new music releases official',
        'best music songs 2024',
        'official music playlist',
        'hit songs official music'
      ];
      
      const randomQuery = musicQueries[Math.floor(Math.random() * musicQueries.length)];
      const fallbackUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=15&q=${encodeURIComponent(randomQuery)}&videoCategoryId=10&key=${YOUTUBE_API_KEY}`;
      console.log('Trying fallback search:', fallbackUrl);
      
      const fallbackRes = await fetch(fallbackUrl);
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (fallbackData.items && fallbackData.items.length > 0) {
          const videos = fallbackData.items
            .filter((item: any) => item.id.videoId !== videoId)
            .filter((item: any) => isMusicVideo(item.snippet.title, item.snippet.channelTitle, currentVideoTitle))
            .map((item: any) => ({
              videoId: item.id.videoId,
              title: item.snippet.title,
              channel: item.snippet.channelTitle,
              thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
            }));
          
          if (videos.length > 0) {
            console.log('Fallback videos fetched:', videos.length);
            setRelatedVideos(videos);
            setOriginalPlaylist(videos);
            
            // Notify parent component about related videos
            if (onRelatedVideosFetched) {
              onRelatedVideosFetched(videos);
            }
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
        playerRef.current?.pauseVideo();
      } else {
        playerRef.current?.playVideo();
      }
      setIsPlaying(!isPlaying);
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
      playerRef.current?.setVolume(newVolume * 100);
    }
  };

  const toggleMute = () => {
    if (isPlayerReady()) {
      if (isMuted) {
        playerRef.current?.unMute();
        setVolume(1);
      } else {
        playerRef.current?.mute();
        setVolume(0);
      }
      setIsMuted(!isMuted);
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    if (isDisliked) setIsDisliked(false);
  };

  const handleDislike = () => {
    setIsDisliked(!isDisliked);
    if (isLiked) setIsLiked(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
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
      playerRef.current?.seekTo(newTime, true);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    playerRef.current?.seekTo(newTime, true);
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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-lg border-t border-gray-700/50">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-gray-700 relative cursor-pointer group" onClick={handleProgressClick}>
        <div 
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out group-hover:from-blue-400 group-hover:via-purple-400 group-hover:to-pink-400"
          style={{ 
            width: `${(currentTime / duration) * 100}%`,
            transition: 'width 0.3s ease-out, background 0.2s ease-out'
          }}
        />
        {/* Hover indicator */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-200" />
      </div>

      {/* Player Content */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left Section - Controls and Time */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevious}
              className="text-white/70 hover:text-white transition-colors p-1"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={togglePlayPause}
              className="text-white hover:text-white transition-colors p-1"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            <button
              onClick={onNext}
              className="text-white/70 hover:text-white transition-colors p-1"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
          <div className="text-white/70 text-sm">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Middle Section - Song Info and Engagement */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="w-12 h-12 rounded overflow-hidden bg-gray-800 flex-shrink-0">
            <img 
              src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
              alt={currentVideoTitle}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-medium truncate">{currentVideoTitle}</div>
            <div className="text-white/70 text-sm truncate">{currentVideoChannel}</div>
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <span className="text-xs">{formatViewCount(viewCount)} views</span>
            <span className="text-xs">{formatLikeCount(likeCount)} likes</span>
            <button
              onClick={handleLike}
              className={`p-1 transition-colors ${isLiked ? 'text-green-500' : 'hover:text-white'}`}
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button
              onClick={handleDislike}
              className={`p-1 transition-colors ${isDisliked ? 'text-red-500' : 'hover:text-white'}`}
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
            <button className="p-1 hover:text-white transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Section - Volume and Options */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-white/70 hover:text-white transition-colors p-1"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setShuffleMode(!shuffleMode)}
            className={`p-1 transition-colors ${shuffleMode ? 'text-blue-500' : 'text-white/70 hover:text-white'}`}
          >
            <Shuffle className="w-5 h-5" />
          </button>
          <button
            onClick={() => setRepeatMode(repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none')}
            className={`p-1 transition-colors ${repeatMode !== 'none' ? 'text-blue-500' : 'text-white/70 hover:text-white'}`}
          >
            <Repeat className="w-5 h-5" />
          </button>
          <button
            onClick={toggleMinimize}
            className="text-white/70 hover:text-white transition-colors p-1"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Hidden iframe for YouTube API */}
      <iframe
        ref={iframeRef}
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&cc_load_policy=0&fs=0&disablekb=1&playsinline=1&enablejsapi=1&origin=${window.location.origin}`}
        title="YouTube audio player"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
        className="hidden"
      />
    </div>
  );
};