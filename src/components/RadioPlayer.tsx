import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useRadioPlayer } from '@/hooks/useRadioPlayer';
import { 
  Radio, 
  Volume2, 
  VolumeX,
  Loader2,
  Disc3,
} from 'lucide-react';

interface RadioEpisode {
  id: string;
  title: string;
  audio_url: string;
  duration_seconds: number | null;
}

interface RadioPlayerProps {
  episodes: RadioEpisode[];
  onEpisodeChange?: (episodeId: string) => void;
}

export function RadioPlayer({ episodes, onEpisodeChange }: RadioPlayerProps) {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isLoading,
    currentEpisode,
    setVolume,
    formatTime,
    progress,
    toggleMute,
  } = useRadioPlayer(episodes);

  // Notify parent of episode changes
  useEffect(() => {
    if (currentEpisode && onEpisodeChange) {
      onEpisodeChange(currentEpisode.id);
    }
  }, [currentEpisode, onEpisodeChange]);

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
  };

  if (episodes.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b border-border"
    >
      <div className="container mx-auto max-w-4xl px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Radio indicator */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              {isLoading ? (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              ) : (
                <Disc3 className={`w-8 h-8 text-primary ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
              )}
              {isPlaying && !isLoading && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-mono text-primary uppercase tracking-wider flex items-center gap-1">
                <Radio className="w-3 h-3" />
                En vivo
              </span>
            </div>
          </div>

          {/* Current episode info + progress */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate mb-1">
              {currentEpisode?.title || 'Cargando...'}
            </div>
            
            {/* Progress bar (read-only for radio) */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground shrink-0">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Volume control */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="h-8 w-8"
            >
              {volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            <div className="w-20 hidden sm:block">
              <Slider
                value={[volume * 100]}
                max={100}
                step={1}
                onValueChange={handleVolumeChange}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
