import React from "react";
import { YouTubeTrack } from "@/data/youtubeTracks";

interface TrackListProps {
  tracks: YouTubeTrack[];
  onSelect: (track: YouTubeTrack) => void;
  selectedTrack?: YouTubeTrack;
}

export const TrackList: React.FC<TrackListProps> = ({ tracks, onSelect, selectedTrack }) => (
  <div className="w-full max-w-xl mx-auto my-6 bg-black/40 border border-white/20 backdrop-blur-lg rounded-2xl shadow-2xl p-4">
    <h2 className="text-2xl font-bold mb-4 text-white">Track List</h2>
    <ul className="divide-y divide-white/10">
      {tracks.map((track) => (
        <li
          key={track.videoId}
          className={`p-4 cursor-pointer hover:bg-blue-900/30 rounded-xl transition-colors ${selectedTrack?.videoId === track.videoId ? 'bg-blue-600/30 font-semibold text-white' : 'text-white'}`}
          onClick={() => onSelect(track)}
        >
          <div className="text-lg">{track.title}</div>
          <div className="text-sm text-white/70">{track.artist}</div>
        </li>
      ))}
    </ul>
  </div>
); 