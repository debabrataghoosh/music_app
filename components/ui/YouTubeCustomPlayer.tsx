import React, { useRef } from "react";
import YouTube, { YouTubeProps } from "react-youtube";

interface YouTubeCustomPlayerProps {
  videoId: string;
}

export const YouTubeCustomPlayer: React.FC<YouTubeCustomPlayerProps> = ({ videoId }) => {
  const playerRef = useRef<any>(null);

  const opts: YouTubeProps["opts"] = {
    height: "360",
    width: "640",
    playerVars: {
      autoplay: 0,
    },
  };

  const onReady: YouTubeProps["onReady"] = (event) => {
    playerRef.current = event.target;
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <YouTube videoId={videoId} opts={opts} onReady={onReady} />
      {/* You can add custom controls here if desired */}
    </div>
  );
}; 