"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
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
  const playerRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch related videos from YouTube
  const fetchRelatedVideos = async (videoId: string) => {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&relatedToVideoId=${videoId}&key=${YOUTUBE_API_KEY}`
      );
      
      if (res.ok) {
        const data = await res.json();
        if (data.items) {
          const videos = data.items.map((item: any) => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
          }));
          setRelatedVideos(videos);
        }
      }
    } catch (err) {
      console.error('Error fetching related videos:', err);
    }
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
            setIsPlaying(true);
            setDuration(event.target.getDuration());
            // Fetch related videos when player is ready
            fetchRelatedVideos(videoId);
          },
          onStateChange: (event: any) => {
            // YouTube states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
            setIsPlaying(event.data === 1);
            
            // Auto-play next song when current song ends
            if (event.data === 0 && relatedVideos.length > 0) {
              playNextSong();
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
      if (playerRef.current && isPlaying) {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const playNextSong = () => {
    if (relatedVideos.length > 0) {
      const nextIndex = (currentVideoIndex + 1) % relatedVideos.length;
      const nextVideo = relatedVideos[nextIndex];
      setCurrentVideoIndex(nextIndex);
      
      if (onNext) {
        onNext(nextVideo);
      } else {
        // Auto-play the next video
        if (playerRef.current) {
          playerRef.current.loadVideoById(nextVideo.videoId);
          setIsPlaying(true);
        }
      }
    }
  };

  const playPreviousSong = () => {
    if (relatedVideos.length > 0) {
      const prevIndex = currentVideoIndex > 0 ? currentVideoIndex - 1 : relatedVideos.length - 1;
      const prevVideo = relatedVideos[prevIndex];
      setCurrentVideoIndex(prevIndex);
      
      if (onPrevious) {
        onPrevious();
      } else {
        // Auto-play the previous video
        if (playerRef.current) {
          playerRef.current.loadVideoById(prevVideo.videoId);
          setIsPlaying(true);
        }
      }
    }
  };

  const togglePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume * 100);
    }
  };

  const toggleMute = () => {
    if (playerRef.current) {
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
    
    if (playerRef.current) {
      playerRef.current.seekTo(newTime, true);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-black/40 border border-white/20 backdrop-blur-lg rounded-2xl shadow-2xl p-6">
      {/* Hidden YouTube iframe */}
      <div ref={iframeRef} className="hidden" />

      {/* Track Info */}
      <div className="text-center mb-6">
        <h3 className="text-white text-lg font-semibold mb-1">{title}</h3>
        <p className="text-white/70 text-sm">{channel}</p>
        {relatedVideos.length > 0 && (
          <p className="text-white/50 text-xs mt-1">
            Auto-play enabled • {relatedVideos.length} related songs
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
        <button
          onClick={playPreviousSong}
          className="p-2 text-white/70 hover:text-white transition-colors"
          disabled={relatedVideos.length === 0}
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
          onClick={playNextSong}
          className="p-2 text-white/70 hover:text-white transition-colors"
          disabled={relatedVideos.length === 0}
        >
          <SkipForward className="w-6 h-6" />
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