'use client';

import React, { useEffect, useState } from "react";
import { FluidGradient } from "@/components/ui/fluid-gradient";
import { YouTubeSearchBar } from "@/components/ui/YouTubeSearchBar";
import { AudioPlayer } from "@/components/ui/AudioPlayer";

const TYPING_TEXT = "Dev's Music App";

export default function Home() {
  const [show, setShow] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);

  useEffect(() => {
    setShow(false);
    const timeout = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  const handleVideoSelect = (result: any) => {
    setSelectedVideo(result);
  };

  return (
    <div className="relative min-h-screen w-full">
      {/* Fixed gradient background */}
      <div className="fixed inset-0 w-full h-full overflow-hidden">
        <FluidGradient />
      </div>
      
      {/* Scrollable content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center py-8 px-2">
        <h1
          className={`text-4xl md:text-6xl font-bold text-white drop-shadow-lg text-center mb-8 transition-all duration-700 ease-out
            ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          {TYPING_TEXT}
        </h1>
        <YouTubeSearchBar onSelect={handleVideoSelect} />
        {selectedVideo && (
          <div className="mt-8 w-full max-w-2xl mx-auto">
            <AudioPlayer 
              videoId={selectedVideo.videoId}
              title={selectedVideo.title}
              channel={selectedVideo.channel}
            />
          </div>
        )}
      </div>
    </div>
  );
}
