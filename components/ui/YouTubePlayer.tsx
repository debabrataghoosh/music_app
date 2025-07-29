import React from "react";

interface YouTubePlayerProps {
  videoId: string;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoId }) => (
  <div className="aspect-w-16 aspect-h-9 w-full max-w-xl mx-auto">
    <iframe
      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&cc_load_policy=0&fs=0&disablekb=1&playsinline=1&enablejsapi=1&origin=${window.location.origin}`}
      title="YouTube audio player"
      frameBorder="0"
      allow="autoplay; encrypted-media"
      allowFullScreen
      className="w-full h-full"
      style={{ display: 'none' }}
    />
    <div className="bg-black/40 border border-white/20 backdrop-blur-lg rounded-2xl shadow-2xl p-6 text-center">
      <div className="text-white text-lg font-semibold mb-2">🎵 Now Playing</div>
      <div className="text-white/70 text-sm">Audio only - Video hidden</div>
      <div className="mt-4 text-white/50 text-xs">
        Video ID: {videoId}
      </div>
    </div>
  </div>
); 