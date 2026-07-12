import { useState, useRef, useEffect, useCallback } from 'react';

interface RadioEpisode {
  id: string;
  title: string;
  audio_url: string;
  duration_seconds: number | null;
}

interface AmbientNarrative {
  narrative: string;
  audioUrl: string | null;
  source: 'generated' | 'cache';
  cacheKey: string;
}

interface RadioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  currentEpisodeIndex: number;
  isAmbientMode: boolean;
  ambientNarrative: AmbientNarrative | null;
}

interface UseRadioPlayerReturn extends RadioState {
  currentEpisode: RadioEpisode | null;
  setVolume: (volume: number) => void;
  formatTime: (seconds: number) => string;
  progress: number;
  toggleMute: () => void;
  setAmbientMode: (enabled: boolean) => void;
  fetchAmbientNarrative: (activeAxis?: string) => Promise<void>;
}

export function useRadioPlayer(episodes: RadioEpisode[], defaultAmbientVolume = 0.3): UseRadioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambientLoopRef = useRef<boolean>(true);
  const [state, setState] = useState<RadioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: defaultAmbientVolume,
    isLoading: false,
    currentEpisodeIndex: 0,
    isAmbientMode: false,
    ambientNarrative: null,
  });
  const previousVolumeRef = useRef(0.7);
  const hasStartedRef = useRef(false);

  // Fetch ambient narrative for the given axis
  const fetchAmbientNarrative = useCallback(async (activeAxis?: string) => {
    try {
      const { data: { session } } = await (await import('@/integrations/supabase/client')).supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ambient-narrative`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ activeAxis }),
      });

      if (response.ok) {
        const data: AmbientNarrative = await response.json();
        setState(prev => ({ ...prev, ambientNarrative: data }));
      }
    } catch (error) {
      console.error('Error fetching ambient narrative:', error);
    }
  }, []);

  // Set ambient mode
  const setAmbientMode = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, isAmbientMode: enabled }));
    if (!enabled && audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.volume = state.volume;
    audio.loop = true; // Loop for ambient mode

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
      if (state.isAmbientMode) {
        // Loop ambient audio
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        // Move to next episode in loop
        setState(prev => {
          const nextIndex = (prev.currentEpisodeIndex + 1) % episodes.length;
          return { ...prev, currentEpisodeIndex: nextIndex, isLoading: true };
        });
      }
    };

    const handleError = () => {
      console.error('Radio audio error');
      if (state.isAmbientMode) {
        // Retry ambient on error
        setTimeout(() => audio.load(), 1000);
      } else {
        // Try next episode on error
        setState(prev => {
          const nextIndex = (prev.currentEpisodeIndex + 1) % episodes.length;
          return { ...prev, currentEpisodeIndex: nextIndex, isLoading: true };
        });
      }
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
    setAmbientMode,
    fetchAmbientNarrative,
  };
}
