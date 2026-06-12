import React from 'react';
import { Play, Info } from 'lucide-react';
import { Movie } from '../types';

interface BillboardProps {
  movie: Movie;
  onPlayClick: (movie: Movie) => void;
  onInfoClick: (movie: Movie) => void;
}

export default function Billboard({ movie, onPlayClick, onInfoClick }: BillboardProps) {
  return (
    <div className="relative h-[56.25vw] min-h-[400px] max-h-[800px] w-full overflow-hidden select-none" id="billboard-container">
      {/* Background backdrop image with side and bottom dark gradients */}
      <img
        src={movie.backdropUrl}
        alt={movie.title}
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover brightness-[55%] transition-transform duration-1000 scale-[1.01]"
      />
      
      {/* Bottom overlay masking row boundary */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />

      {/* Hero content details */}
      <div className="absolute top-[30%] left-4 md:left-12 max-w-[90%] md:max-w-xl flex flex-col gap-3 md:gap-5">
        
        {/* Match and year flags */}
        <div className="flex items-center gap-3 text-xs md:text-sm font-semibold">
          <span className="text-green-500 font-bold tracking-wide">
            {movie.matchScore}% Match
          </span>
          <span className="text-neutral-300 font-sans">
            {movie.releaseYear}
          </span>
          <span className="border border-neutral-700 rounded px-1.5 py-0.5 text-[10px] text-neutral-300 tracking-wider">
            {movie.rating}
          </span>
          <span className="text-neutral-300 font-sans">
            {movie.duration}
          </span>
        </div>

        {/* Cinematic Title */}
        <h1 className="text-3xl md:text-6xl font-extrabold tracking-tight text-white mb-2 md:mb-0 font-sans transition-all duration-300">
          {movie.title}
        </h1>

        {/* Overview snippet */}
        <p className="text-neutral-300 text-xs md:text-base leading-relaxed max-w-sm md:max-w-lg truncate-3-lines font-sans">
          {movie.overview}
        </p>

        {/* Quick action buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            id={`billboard-play-${movie.id}`}
            onClick={() => onPlayClick(movie)}
            className="bg-white hover:bg-[#b3b3b3] text-black font-sans font-bold text-xs md:text-sm px-4 md:px-8 py-2 md:py-3 rounded-md flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] shadow"
          >
            <Play className="w-4 h-4 fill-black md:w-5 md:h-5" />
            Play Title
          </button>
          
          <button
            id={`billboard-info-${movie.id}`}
            onClick={() => onInfoClick(movie)}
            className="bg-neutral-600/60 hover:bg-neutral-500/50 text-white font-sans font-bold text-xs md:text-sm px-4 md:px-7 py-2 md:py-3 rounded-md flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] border border-neutral-500/20"
          >
            <Info className="w-4 h-4 md:w-5 md:h-5 text-white" />
            More Info
          </button>
        </div>
      </div>

      {/* Floating corner rating badge */}
      <div className="absolute right-0 bottom-16 bg-neutral-900/40 border-l-4 border-neutral-300 px-4 py-1.5 text-xs font-bold font-sans tracking-widest text-[#d2d2d2] select-none">
        {movie.rating}
      </div>
    </div>
  );
}
