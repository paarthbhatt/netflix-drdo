import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Plus, Check, Info } from 'lucide-react';
import { Movie, ViewerProfile } from '../types';

interface MovieRowProps {
  title: string;
  movies: Movie[];
  currentProfile: ViewerProfile;
  onMovieClick: (movie: Movie) => void;
  onPlayClick: (movie: Movie) => void;
  onToggleWatchlist: (movieId: string) => void;
  rowId: string;
}

export default function MovieRow({
  title,
  movies,
  currentProfile,
  onMovieClick,
  onPlayClick,
  onToggleWatchlist,
  rowId,
}: MovieRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = direction === 'left' 
        ? scrollLeft - clientWidth * 0.75 
        : scrollLeft + clientWidth * 0.75;
      
      rowRef.current.scrollTo({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (movies.length === 0) return null;

  return (
    <div className="space-y-2 md:space-y-4 px-4 md:px-12 select-none relative group" id={`movie-row-${rowId}`}>
      {/* Category header */}
      <h2 className="text-sm md:text-2xl font-bold tracking-tight text-white font-sans transition-colors duration-200 hover:text-[#e50914] cursor-pointer inline-block">
        {title}
      </h2>

      {/* Slide elements */}
      <div className="relative">
        
        {/* Left scroll control arrow */}
        <button
          id={`scroll-left-${rowId}`}
          onClick={() => handleScroll('left')}
          className="absolute left-0 top-0 bottom-0 w-10 md:w-12 bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 z-10 transition-opacity cursor-pointer border-r border-[#1a1a1a]"
        >
          <ChevronLeft className="w-6 h-6 hover:scale-125 transition-transform" />
        </button>

        {/* Carousel Tray */}
        <div
          ref={rowRef}
          id={`tray-${rowId}`}
          className="flex items-center gap-2.5 overflow-x-hidden py-4 scrollbar-none"
        >
          {movies.map((mov) => {
            const isBookmarked = currentProfile.watchlist?.includes(mov.id) || false;
            return (
              <div
                key={mov.id}
                id={`movie-card-${mov.id}`}
                className="relative min-w-[200px] w-[200px] sm:min-w-[240px] sm:w-[240px] h-[112px] sm:h-[135px] rounded overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.08] hover:shadow-2xl z-20 hover:z-30 group/card bg-[#141414] border border-[#222]"
              >
                {/* Thumbnail graphic */}
                <img
                  src={mov.thumbnailUrl}
                  alt={mov.title}
                  referrerPolicy="no-referrer"
                  onClick={() => onMovieClick(mov)}
                  className="w-full h-full object-cover transition-transform group-hover/card:brightness-[60%]"
                />

                {/* Floating Actions Strip on Hover */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/card:opacity-100 transition-all duration-200 flex flex-col justify-end p-3 gap-1.5 md:gap-2 select-none">
                  <h3 
                    onClick={() => onMovieClick(mov)}
                    className="font-bold text-white text-xs sm:text-sm truncate font-sans"
                  >
                    {mov.title}
                  </h3>

                  <div className="flex items-center justify-between text-[10px] md:text-xs">
                    <span className="text-green-500 font-bold font-sans">
                      {mov.matchScore}% Match
                    </span>
                    <span className="text-neutral-400 font-sans">
                      {mov.duration}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-neutral-800">
                    <button
                      id={`play-card-${mov.id}`}
                      onClick={() => onPlayClick(mov)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white hover:bg-neutral-300 text-black flex items-center justify-center cursor-pointer shadow hover:scale-105"
                    >
                      <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                    </button>

                    <button
                      id={`watchlist-card-${mov.id}`}
                      onClick={() => onToggleWatchlist(mov.id)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 text-white flex items-center justify-center cursor-pointer transition-all hover:scale-105 ${
                        isBookmarked ? 'border-green-500 bg-green-500/10' : 'border-neutral-500 hover:border-white bg-[#141414]'
                      }`}
                    >
                      {isBookmarked ? <Check className="w-4 h-4 text-green-500" /> : <Plus className="w-4 h-4" />}
                    </button>

                    <button
                      id={`info-card-${mov.id}`}
                      onClick={() => onMovieClick(mov)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-neutral-500 hover:border-white text-white flex items-center justify-center cursor-pointer transition-all hover:scale-105 bg-[#141414]"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right scroll control arrow */}
        <button
          id={`scroll-right-${rowId}`}
          onClick={() => handleScroll('right')}
          className="absolute right-0 top-0 bottom-0 w-10 md:w-12 bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 z-10 transition-opacity cursor-pointer border-l border-[#1a1a1a]"
        >
          <ChevronRight className="w-6 h-6 hover:scale-125 transition-transform" />
        </button>
      </div>
    </div>
  );
}
