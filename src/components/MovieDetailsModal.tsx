import React from 'react';
import { X, Play, Plus, Check, Star, PlayCircle } from 'lucide-react';
import { Movie, ViewerProfile } from '../types';
import { movies } from '../moviesData';

interface MovieDetailsModalProps {
  movie: Movie;
  currentProfile: ViewerProfile;
  onClose: () => void;
  onPlayClick: (movie: Movie) => void;
  onToggleWatchlist: (movieId: string) => void;
}

export default function MovieDetailsModal({
  movie,
  currentProfile,
  onClose,
  onPlayClick,
  onToggleWatchlist,
}: MovieDetailsModalProps) {
  const isBookmarked = currentProfile.watchlist?.includes(movie.id) || false;

  // Find related videos within similar genres (excluding current)
  const relatedMovies = movies
    .filter((m) => m.id !== movie.id && m.genres.some((g) => movie.genres.includes(g)))
    .slice(0, 3);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      id="movie-details-backdrop"
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in select-none"
    >
      <div 
        id="movie-details-dialog"
        className="w-full max-w-3xl bg-[#181818] rounded-xl overflow-hidden shadow-2xl relative border border-neutral-800 transition-all duration-300"
      >
        {/* Dismiss trigger */}
        <button
          id="close-details-modal"
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white p-2 rounded-full cursor-pointer z-10 transition-colors border border-neutral-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Large Cinematic Banner Header */}
        <div className="relative h-64 sm:h-96 w-full">
          <img
            src={movie.backdropUrl}
            alt={movie.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover brightness-[65%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] to-transparent" />

          {/* Title overlay */}
          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-4 font-sans drop-shadow-lg">
              {movie.title}
            </h1>

            {/* Banner control row */}
            <div className="flex items-center gap-3">
              <button
                id="details-play-button"
                onClick={() => onPlayClick(movie)}
                className="bg-white hover:bg-neutral-300 text-black font-sans font-bold text-xs sm:text-sm px-6 py-2.5 rounded-md flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                Play Title
              </button>

              <button
                id="details-watchlist-button"
                onClick={() => onToggleWatchlist(movie.id)}
                className={`w-10 h-10 rounded-full border-2 text-white flex items-center justify-center cursor-pointer transition-all ${
                  isBookmarked 
                    ? 'border-green-500 bg-green-500/10 hover:border-green-400' 
                    : 'border-neutral-500 hover:border-white bg-[#181818]'
                }`}
              >
                {isBookmarked ? <Check className="w-5 h-5 text-green-500" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Info Grid details & recommendations */}
        <div className="p-6 space-y-8 text-neutral-300">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
            {/* Left/Middle Column: Overview narrative */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3.5 text-xs sm:text-sm">
                <span className="text-green-500 font-extrabold tracking-wide">
                  {movie.matchScore}% Match
                </span>
                <span className="text-neutral-400">{movie.releaseYear}</span>
                <span className="border border-neutral-700 text-neutral-400 px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider">
                  {movie.rating}
                </span>
                <span className="text-neutral-400">{movie.duration}</span>
              </div>

              <p className="text-sm leading-relaxed text-neutral-200">
                {movie.overview}
              </p>
            </div>

            {/* Right Column: Cast and Genre taxonomy */}
            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-neutral-500 font-semibold block">Cast Members:</span>
                <span className="text-neutral-300 text-[11px] leading-tight block mt-0.5">
                  {movie.cast.join(', ')}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 font-semibold block">Genres:</span>
                <span className="text-neutral-300 text-[11px] leading-tight block mt-0.5">
                  {movie.genres.join(', ')}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 font-semibold block">Language Options:</span>
                <span className="text-neutral-300 text-[11px] block mt-0.5">
                  English [Original], English [Subtitles], Spanish, French
                </span>
              </div>
            </div>
          </div>

          {/* Similar titles row */}
          {relatedMovies.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-neutral-800">
              <h3 className="text-lg font-bold text-white font-sans tracking-wide">
                More Like This
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {relatedMovies.map((rel) => (
                  <div 
                    key={rel.id} 
                    id={`similar-card-${rel.id}`}
                    className="bg-[#202020] rounded-xl overflow-hidden border border-neutral-800 select-none group/rel cursor-pointer"
                  >
                    <div className="relative h-28 w-full">
                      <img
                        src={rel.backdropUrl}
                        alt={rel.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover/rel:brightness-75 transition-all"
                      />
                      <button 
                        id={`similar-play-${rel.id}`}
                        onClick={() => onPlayClick(rel)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover/rel:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <PlayCircle className="w-10 h-10 text-white fill-white/10" />
                      </button>
                    </div>

                    <div className="p-4 space-y-2 text-xs font-sans">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-green-500">{rel.matchScore}% Match</span>
                        <span className="border border-neutral-700 px-1 rounded text-[9px] text-neutral-400">
                          {rel.rating}
                        </span>
                      </div>
                      <h4 className="font-bold text-white truncate text-xs">{rel.title}</h4>
                      <p className="text-[10px] text-neutral-400 leading-normal truncate-2-lines">
                        {rel.overview}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
