import { useState, useRef, useEffect, useCallback } from 'react';

interface RadioEpisode {
  id: string;
  title: string;
  audio_url: string;
  duration_seconds: number | null;
}

interface RadioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  currentEpisodeIndex: number;
}

interface UseRadioPlayerReturn extends RadioState {
  currentEpisode: RadioEpisode | null;
  setVolume: (volume: number) => void;
  formatTime: (seconds: number) => string;
  progress: number;
  toggleMute: () => void;
}

export function useRadioPlayer(episodes: RadioEpisode[]): UseRadioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<RadioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    isLoading: true,
    currentEpisodeIndex: 0,
  });
  const previousVolumeRef = useRef(0.7);
  const hasStartedRef = useRef(false);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.volume = state.volume;

    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: audio.currentTime }));
    };

    const handleLoadedMetadata = () => {
      setState(prev => ({ 
        ...prev, 
        duration: audio.duration,
        isLoading: false,
      }));
    };

    const handleEnded = () => {
      // Move to next episode in loop
      setState(prev => {
        const nextIndex = (prev.currentEpisodeIndex + 1) % episodes.length;
        return { ...prev, currentEpisodeIndex: nextIndex, isLoading: true };
      });
    };

    const handleError = () => {
      console.error('Radio audio error');
      // Try next episode on error
      setState(prev => {
        const nextIndex = (prev.currentEpisodeIndex + 1) % episodes.length;
        return { ...prev, currentEpisodeIndex: nextIndex, isLoading: true };
      });
    };

    const handleCanPlay = () => {
      setState(prev => ({ ...prev, isLoading: false }));
      // Autoplay when ready
      audio.play()
        .then(() => setState(prev => ({ ...prev, isPlaying: true })))
        .catch(err => console.log('Autoplay blocked:', err));
    };

    const handlePlaying = () => {
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('playing', handlePlaying);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.pause();
    };
  }, [episodes.length]);

  // Load and start episode at random point
  useEffect(() => {
    if (!audioRef.current || episodes.length === 0) return;
    
    const audio = audioRef.current;
    const episode = episodes[state.currentEpisodeIndex];
    
    if (!episode) return;

    setState(prev => ({ ...prev, isLoading: true }));
    audio.src = episode.audio_url;
    
    // Set random start time after metadata loads
    const setRandomStart = () => {
      if (audio.duration && !hasStartedRef.current) {
        // Random position between 0 and 80% of the track
        const randomPosition = Math.random() * audio.duration * 0.8;
        audio.currentTime = randomPosition;
        hasStartedRef.current = true;
      }
    };

    audio.addEventListener('loadedmetadata', setRandomStart, { once: true });
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', setRandomStart);
    };
  }, [state.currentEpisodeIndex, episodes]);

  // Handle episode index change - reset hasStarted for subsequent episodes
  useEffect(() => {
    if (state.currentEpisodeIndex > 0) {
      hasStartedRef.current = false;
    }
  }, [state.currentEpisodeIndex]);

  const setVolume = useCallback((volume: number) => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
    setState(prev => ({ ...prev, volume }));
    if (volume > 0) {
      previousVolumeRef.current = volume;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    if (state.volume > 0) {
      previousVolumeRef.current = state.volume;
      setVolume(0);
    } else {
      setVolume(previousVolumeRef.current || 0.7);
    }
  }, [state.volume, setVolume]);

  const formatTime = useCallback((seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
  const currentEpisode = episodes[state.currentEpisodeIndex] || null;

  return {
    ...state,
    currentEpisode,
    setVolume,
    formatTime,
    progress,
    toggleMute,
  };
}
