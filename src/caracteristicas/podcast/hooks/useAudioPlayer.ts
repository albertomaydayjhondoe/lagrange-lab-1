import { useState, useRef, useEffect, useCallback } from 'react';

interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  error: string | null;
}

interface UseAudioPlayerReturn extends AudioPlayerState {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  loadAudio: (src: string) => void;
  formatTime: (seconds: number) => string;
  progress: number;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: audio.currentTime }));
    };

    const handleLoadedMetadata = () => {
      setState(prev => ({ 
        ...prev, 
        duration: audio.duration,
        isLoading: false,
        error: null,
      }));
    };

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
    };

    const handleError = () => {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Error al cargar el audio',
        isPlaying: false,
      }));
    };

    const handleLoadStart = () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    };

    const handleCanPlay = () => {
      setState(prev => ({ ...prev, isLoading: false }));
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.pause();
    };
  }, []);

  const loadAudio = useCallback((src: string) => {
    if (!audioRef.current) return;
    audioRef.current.src = src;
    audioRef.current.load();
  }, []);

  const play = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.play()
      .then(() => setState(prev => ({ ...prev, isPlaying: true })))
      .catch(err => console.error('Play error:', err));
  }, []);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const toggle = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setState(prev => ({ ...prev, currentTime: time }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
    setState(prev => ({ ...prev, volume }));
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  return {
    ...state,
    play,
    pause,
    toggle,
    seek,
    setVolume,
    loadAudio,
    formatTime,
    progress,
  };
}
