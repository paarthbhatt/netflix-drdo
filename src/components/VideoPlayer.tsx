import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize, Subtitles, ArrowLeft, Loader2 } from 'lucide-react';
import { Movie } from '../types';

interface VideoPlayerProps {
  movie: Movie;
  onClose: () => void;
}

export default function VideoPlayer({ movie, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Video State
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isWaiting, setIsWaiting] = useState(true);
  
  // Custom overlays
  const [subtitleTrack, setSubtitleTrack] = useState<'off' | 'english'>('off');
  const [showSubDropdown, setShowSubDropdown] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Inactivity timeout to fade controls away
  useEffect(() => {
    let timeoutId: number;

    const resetTimer = () => {
      setControlsVisible(true);
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (isPlaying) {
          setControlsVisible(false);
        }
      }, 3500);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', resetTimer);
      container.addEventListener('touchstart', resetTimer);
    }

    resetTimer();

    return () => {
      if (container) {
        container.removeEventListener('mousemove', resetTimer);
        container.removeEventListener('touchstart', resetTimer);
      }
      window.clearTimeout(timeoutId);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.error("Playback interrupted or blocked by browser policies: ", err);
        });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsWaiting(false);
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMute = !isMuted;
      videoRef.current.muted = nextMute;
      setIsMuted(nextMute);
    }
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
    setCurrentTime(val);
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch((err) => {
          console.error(`Fullscreen request failed: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const hours = Math.floor(timeInSeconds / 3600);
    const mins = Math.floor((timeInSeconds % 3600) / 60);
    const secs = Math.floor(timeInSeconds % 60);

    const pad = (n: number) => (n < 10 ? `0${n}` : n);

    if (hours > 0) {
      return `${hours}:${pad(mins)}:${pad(secs)}`;
    }
    return `${mins}:${pad(secs)}`;
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden select-none animate-fade-in"
      id="video-player-container"
    >
      {/* HTML5 video element source streams */}
      <video
        ref={videoRef}
        src={movie.videoUrl}
        autoPlay
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsWaiting(true)}
        onPlaying={() => setIsWaiting(false)}
        onCanPlay={() => setIsWaiting(false)}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
        id="video-element-core"
      />

      {/* Mock Subtitle Rendering overlay */}
      {subtitleTrack === 'english' && isPlaying && (
        <div 
          id="subtitle-overlay"
          className="absolute bottom-24 inset-x-4 text-center pointer-events-none transition-opacity"
        >
          <span className="bg-black/80 px-4 py-1.5 rounded-lg border border-neutral-800 text-sm md:text-lg text-yellow-300 font-sans tracking-wide">
            {currentTime < duration * 0.25 && "[Dramatic cinematic background audio playing]"}
            {currentTime >= duration * 0.25 && currentTime < duration * 0.5 && "Who goes there? We are traveling under the stars."}
            {currentTime >= duration * 0.5 && currentTime < duration * 0.75 && "Prepare the engines! Warp-drive in 10 seconds."}
            {currentTime >= duration * 0.75 && "[Epic retro synthwave music crescendos]"}
          </span>
        </div>
      )}

      {/* Cinematic Load Indicator spinner */}
      {isWaiting && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none" id="video-spinner">
          <Loader2 className="w-16 h-16 animate-spin text-red-600" />
        </div>
      )}

      {/* --- Overlay Controls panel (toggles matching inactivity) --- */}
      <div 
        id="player-overlays"
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 flex flex-col justify-between py-6 px-6 md:px-12 transition-opacity duration-500 z-10 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Header toolbar */}
        <div className="flex items-center gap-6">
          <button
            id="exit-player-button"
            onClick={onClose}
            className="text-white hover:text-red-500 cursor-pointer p-2 rounded-full hover:bg-neutral-900/40 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 md:w-8 md:h-8" />
          </button>
          
          <div>
            <span className="text-gray-400 font-sans uppercase tracking-widest text-[10px] md:text-xs">
              Streaming Now • {movie.rating}
            </span>
            <h1 className="text-white font-sans font-bold text-base md:text-2xl mt-0.5 truncate max-w-md">
              {movie.title}
            </h1>
          </div>
        </div>

        {/* Center play state indicator overlay (click helper) */}
        {!isPlaying && !isWaiting && (
          <button 
            id="center-play-button"
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center justify-center cursor-pointer transition-colors mx-auto"
          >
            <Play className="w-6 h-6 fill-white ml-1" />
          </button>
        )}

        {/* Bottom controls panel toolbar */}
        <div className="space-y-4">
          
          {/* Custom Time Scrubber slider bar */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-neutral-300 font-mono select-none">
              {formatTime(currentTime)}
            </span>
            
            <input
              id="progress-scrubber"
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleScrubberChange}
              className="w-full h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-red-600 focus:outline-none focus:ring-0"
            />
            
            <span className="text-xs text-neutral-300 font-mono select-none">
              {formatTime(duration)}
            </span>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between">
            {/* Left controls */}
            <div className="flex items-center gap-6 md:gap-8">
              <button
                id="play-pause-toggle-button"
                onClick={togglePlay}
                className="text-white hover:text-red-500 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
              </button>

              <button
                id="skip-back-10s"
                onClick={() => skip(-10)}
                className="text-white hover:text-red-500 cursor-pointer"
                title="Rewind 10s"
              >
                <RotateCcw className="w-5 h-5 md:w-6 md:h-6" />
              </button>

              <button
                id="skip-forward-10s"
                onClick={() => skip(10)}
                className="text-white hover:text-red-500 cursor-pointer"
                title="Fast forward 10s"
              >
                <RotateCw className="w-5 h-5 md:w-6 md:h-6" />
              </button>

              {/* Volume sliders */}
              <div className="flex items-center gap-2.5 group/vol">
                <button
                  id="mute-unmute-button"
                  onClick={toggleMute}
                  className="text-white hover:text-red-500 cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                </button>
                <input
                  id="volume-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-0 group-hover/vol:w-16 h-1 bg-neutral-600 rounded appearance-none cursor-pointer accent-red-600 transition-all focus:outline-none"
                />
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-6 relative">
              
              {/* Mock Subtitle track config */}
              <div className="relative">
                <button
                  id="subtitles-toggle-menu"
                  onClick={() => setShowSubDropdown(!showSubDropdown)}
                  className={`p-1.5 hover:text-red-500 cursor-pointer ${subtitleTrack !== 'off' ? 'text-red-500 font-bold' : 'text-white'}`}
                  title="Subtitle Track Options"
                >
                  <Subtitles className="w-5 h-5 md:w-6 md:h-6" />
                </button>

                {showSubDropdown && (
                  <div 
                    id="subtitles-dropdown"
                    className="absolute bottom-10 right-0 w-36 bg-black border border-neutral-800 rounded py-1 z-50 text-xs"
                  >
                    <button
                      id="sub-off-option"
                      onClick={() => {
                        setSubtitleTrack('off');
                        setShowSubDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-neutral-900 ${subtitleTrack === 'off' ? 'text-red-500 font-bold' : 'text-gray-300'}`}
                    >
                      Subtitles Off
                    </button>
                    <button
                      id="sub-en-option"
                      onClick={() => {
                        setSubtitleTrack('english');
                        setShowSubDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-neutral-900 ${subtitleTrack === 'english' ? 'text-red-500 font-bold' : 'text-gray-300'}`}
                    >
                      English [CC]
                    </button>
                  </div>
                )}
              </div>

              {/* Fullscreen agent */}
              <button
                id="fullscreen-toggle"
                onClick={handleFullscreen}
                className="text-white hover:text-red-500 cursor-pointer"
              >
                <Maximize className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
