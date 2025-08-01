import React from "react";
import { Play, Music } from "lucide-react";

interface RelatedVideo {
  videoId: string;
  title: string;
  channel: string;
  thumbnail?: string;
}

interface RelatedVideosProps {
  videos: RelatedVideo[];
  onSelect: (video: RelatedVideo) => void;
  currentVideoId?: string;
}

export const RelatedVideos: React.FC<RelatedVideosProps> = ({ 
  videos, 
  onSelect, 
  currentVideoId 
}) => {
  if (!videos || videos.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto my-6 bg-black/40 border border-white/20 backdrop-blur-lg rounded-2xl shadow-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Music className="w-5 h-5 text-blue-400" />
        <h2 className="text-xl font-bold text-white">Related Songs</h2>
      </div>
      <div className="grid gap-3">
        {videos
          .filter(video => video.videoId !== currentVideoId) // Exclude current video
          .slice(0, 8) // Show max 8 suggestions
          .map((video) => (
            <div
              key={video.videoId}
              className="flex items-center gap-3 p-3 bg-white/5 hover:bg-blue-900/30 rounded-xl cursor-pointer transition-all duration-200 group"
              onClick={() => onSelect(video)}
            >
              <div className="flex-shrink-0">
                {video.thumbnail ? (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-800">
                    <img 
                      src={video.thumbnail} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to play icon if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors hidden">
                      <Play className="w-4 h-4 text-blue-400 group-hover:text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                    <Play className="w-4 h-4 text-blue-400 group-hover:text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate group-hover:text-blue-300 transition-colors">
                  {video.title}
                </div>
                <div className="text-sm text-white/70 truncate">
                  {video.channel}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}; 