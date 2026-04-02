import { useEffect, useRef, useState } from "react";

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getVolumeIcon(volume, muted) {
  if (muted || volume === 0) {
    return "M";
  }

  if (volume < 0.5) {
    return "L";
  }

  return "H";
}

export function Player({ song, streamUrl, canGoPrevious, canGoNext, onPrevious, onNext }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    // STOP the old stream completely before starting new one
    audio.pause();
    audio.removeAttribute("src");
    audio.load(); // Aborts any in-progress download

    if (!streamUrl) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    setCurrentTime(0);
    setDuration(0);
    audio.src = streamUrl;
    audio.load();
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.error("[player] playback failed:", err.message);
        setIsPlaying(false);
      });
  }, [streamUrl]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.muted = muted;
  }, [muted]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      if (onNext && canGoNext) {
        onNext();
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [canGoNext, onNext]);

  function togglePlayback() {
    const audio = audioRef.current;

    if (!audio || !streamUrl) {
      return;
    }

    if (audio.paused) {
      audio.play();
      return;
    }

    audio.pause();
  }

  function seekBy(offset) {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const nextTime = Math.min(Math.max(audio.currentTime + offset, 0), duration || audio.currentTime + offset);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  const [playbackRate, setPlaybackRate] = useState(1);

  function cyclePlaybackRate() {
    const rates = [1, 1.25, 0.75, 1.5];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = playbackRate;
    }
  }, [playbackRate, streamUrl]);

  function handleSeek(value) {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.currentTime = value;
    setCurrentTime(value);
  }

  function toggleMute() {
    setMuted((current) => !current);
  }

  const [isBuffering, setIsBuffering] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleCanPlay = () => setIsBuffering(false);

    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadstart', handleWaiting);

    return () => {
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadstart', handleWaiting);
    };
  }, []);

  return (
    <div className="flex w-full items-center justify-between bg-[#000000] text-[#FFFFFF]" style={{ height: '90px', padding: '0 21px', borderTop: '1px solid #1A1A1A' }}>
      <audio ref={audioRef} preload="auto" />
      
      {/* 1. Track Info (Left) */}
      <div className="flex items-center" style={{ width: '30%', minWidth: '180px', gap: '13px' }}>
        {song ? (
          <>
            <div className="relative flex shrink-0 items-center justify-center bg-[#282828] overflow-hidden shadow-sm" style={{ width: '55px', height: '55px', borderRadius: '8px' }}>
                {song.thumbnail ? (
                  <img src={song.thumbnail} alt="cover" className="h-full w-full object-cover" />
                ) : (
                  <div className="font-bold text-[#B3B3B3]" style={{ fontSize: '12px' }}>ॐ</div>
                )}
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold text-[#FFFFFF]" style={{ fontSize: '16px' }}>{song.title}</div>
              <div className="truncate text-[#B3B3B3]" style={{ fontSize: '14px' }}>{song.artist}</div>
            </div>
          </>
        ) : (
          <div className="flex items-center" style={{ gap: '13px' }}>
            <div className="shrink-0 bg-[#181818]" style={{ width: '55px', height: '55px', borderRadius: '8px' }} />
            <div className="min-w-0 flex flex-col" style={{ gap: '8px' }}>
              <div className="rounded-full bg-[#181818]" style={{ height: '13px', width: '96px' }} />
              <div className="rounded-full bg-[#181818]" style={{ height: '8px', width: '64px' }} />
            </div>
          </div>
        )}
      </div>

      {/* 2. Controls & Progress (Center) */}
      <div className="flex flex-1 flex-col items-center justify-center" style={{ maxWidth: '722px', gap: '8px' }}>
        <div className="flex items-center" style={{ gap: '21px' }}>
          <button
             onClick={cyclePlaybackRate}
             className={`uppercase font-bold tracking-widest transition`}
             style={{ fontSize: '12px', color: playbackRate !== 1 ? '#1DB954' : '#B3B3B3' }}
          >
            {playbackRate}x
          </button>
          <button
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="flex items-center justify-center disabled:opacity-40 transition hover:scale-105"
            style={{ width: '34px', height: '34px', color: '#B3B3B3' }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '21px', height: '21px' }}><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          </button>
          <button
            onClick={togglePlayback}
            disabled={!streamUrl}
            className="flex items-center justify-center rounded-full hover:scale-105 disabled:opacity-40 transition"
            style={{ width: '42px', height: '42px', backgroundColor: '#FFFFFF', color: '#000000' }}
          >
            {isBuffering ? (
              <svg className="animate-spin" viewBox="0 0 24 24" fill="none" style={{ width: '21px', height: '21px' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" opacity="0.3"></circle>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"></path>
              </svg>
            ) : isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '21px', height: '21px' }}><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> 
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '21px', height: '21px', marginLeft: '3px' }}><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          <button
            onClick={onNext}
            disabled={!canGoNext}
            className="flex items-center justify-center disabled:opacity-40 transition hover:scale-105"
            style={{ width: '34px', height: '34px', color: '#B3B3B3' }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '21px', height: '21px' }}><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
          <button
            onClick={() => seekBy(0 - currentTime)}
            disabled={!streamUrl || currentTime < 2}
            className="uppercase font-bold tracking-widest disabled:opacity-40 transition"
            style={{ fontSize: '12px', color: '#B3B3B3' }}
          >
            RST
          </button>
        </div>
        <div className="flex w-full items-center text-[#A7A7A7]" style={{ gap: '8px', fontSize: '12px' }}>
          <span className="text-right" style={{ width: '42px' }}>{formatTime(currentTime)}</span>
          <div className="group relative flex flex-1 cursor-pointer items-center" style={{ height: '13px' }}>
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => handleSeek(Number(event.target.value))}
              className="absolute z-10 w-full opacity-0 cursor-pointer"
            />
            {/* Custom Range Track */}
            <div className="w-full bg-[#4D4D4D] rounded-full overflow-hidden" style={{ height: '4px' }}>
               <div 
                 className="h-full bg-[#FFFFFF] group-hover:bg-[#1DB954] transition-colors"
                 style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
               />
            </div>
            {/* Custom Range Thumb (visible on hover) */}
            <div 
              className="absolute -ml-1.5 rounded-full bg-[#FFFFFF] opacity-0 group-hover:opacity-100 shadow pointer-events-none transition-opacity"
              style={{ width: '13px', height: '13px', left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <span style={{ width: '42px' }}>{formatTime(duration)}</span>
        </div>
      </div>

      {/* 3. Extra Controls (Right) */}
      <div className="flex items-center justify-end pr-2" style={{ width: '30%', minWidth: '180px', gap: '13px' }}>
        <button
          onClick={toggleMute}
          className="text-[#B3B3B3] hover:text-[#FFFFFF] transition"
        >
          {getVolumeIcon(volume, muted) === "M" ? (
             <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px' }}><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63v-.01zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
          ) : (
             <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px' }}><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
          )}
        </button>
        <div className="group relative flex cursor-pointer items-center" style={{ height: '13px', width: '96px' }}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => {
                const nextVolume = Number(e.target.value);
                setVolume(nextVolume);
                if (nextVolume > 0 && muted) setMuted(false);
              }}
              className="absolute z-10 w-full opacity-0 cursor-pointer"
            />
            <div className="w-full bg-[#4D4D4D] rounded-full overflow-hidden" style={{ height: '4px' }}>
               <div 
                 className="h-full bg-[#FFFFFF] group-hover:bg-[#1DB954] transition-colors"
                 style={{ width: `${volume * 100}%` }}
               />
            </div>
            <div 
              className="absolute -ml-1.5 rounded-full bg-[#FFFFFF] opacity-0 group-hover:opacity-100 shadow pointer-events-none transition-opacity"
              style={{ width: '13px', height: '13px', left: `${volume * 100}%` }}
            />
        </div>
      </div>
    </div>
  );
}
