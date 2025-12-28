import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Loader2,
  SkipBack,
  SkipForward,
} from 'lucide-react';

interface AudioPlayerProps {
  src: string | null;
  title: string;
  isActive: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export function AudioPlayer({ src, title, isActive, onPlayStateChange }: AudioPlayerProps) {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isLoading,
    error,
    toggle,
    seek,
    setVolume,
    loadAudio,
    formatTime,
    progress,
    pause,
  } = useAudioPlayer();

  useEffect(() => {
    if (src && isActive) {
      loadAudio(src);
    }
  }, [src, isActive, loadAudio]);

  useEffect(() => {
    if (!isActive && isPlaying) {
      pause();
    }
  }, [isActive, isPlaying, pause]);

  useEffect(() => {
    onPlayStateChange?.(isPlaying);
  }, [isPlaying, onPlayStateChange]);

  const handleSeek = (value: number[]) => {
    const newTime = (value[0] / 100) * duration;
    seek(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
  };

  const skipBackward = () => {
    seek(Math.max(0, currentTime - 10));
  };

  const skipForward = () => {
    seek(Math.min(duration, currentTime + 10));
  };

  if (!src) {
    return (
      <div className="flex items-center justify-center p-4 rounded-lg bg-secondary/30">
        <span className="text-sm text-muted-foreground font-mono">
          Audio no disponible
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-secondary/50 border border-border"
    >
      {/* Title */}
      <div className="text-sm font-medium text-foreground mb-3 truncate">
        {title}
      </div>

      {/* Error state */}
      {error && (
        <div className="text-sm text-destructive mb-3">
          {error}
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-3">
        <Slider
          value={[progress]}
          max={100}
          step={0.1}
          onValueChange={handleSeek}
          className="cursor-pointer"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs font-mono text-muted-foreground">
            {formatTime(currentTime)}
          </span>
          <span className="text-xs font-mono text-muted-foreground">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Skip back */}
          <Button
            variant="ghost"
            size="icon"
            onClick={skipBackward}
            className="h-8 w-8"
            disabled={!duration}
          >
            <SkipBack className="w-4 h-4" />
          </Button>

          {/* Play/Pause */}
          <Button
            variant="default"
            size="icon"
            onClick={toggle}
            className="h-10 w-10 rounded-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </Button>

          {/* Skip forward */}
          <Button
            variant="ghost"
            size="icon"
            onClick={skipForward}
            className="h-8 w-8"
            disabled={!duration}
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setVolume(volume > 0 ? 0 : 1)}
            className="h-8 w-8"
          >
            {volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          <div className="w-20">
            <Slider
              value={[volume * 100]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
