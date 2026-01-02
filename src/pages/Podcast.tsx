import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LagrangeNav } from '@/components/LagrangeNav';
import { LagrangeFooter } from '@/components/LagrangeFooter';
import { FogOverlay } from '@/components/FogOverlay';
import { Badge } from '@/components/ui/badge';
import { RadioPlayer } from '@/components/RadioPlayer';
import { supabase } from '@/integrations/supabase/client';
import { 
  Clock, 
  Mic,
  Radio,
  Disc3,
  Headphones
} from 'lucide-react';

interface PodcastEpisode {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  duration_seconds: number | null;
  eje: string | null;
  published: boolean | null;
  published_at: string | null;
  created_at: string;
}

interface EpisodeCardProps {
  episode: PodcastEpisode;
  isCurrentlyPlaying: boolean;
}

function EpisodeCard({ episode, isCurrentlyPlaying }: EpisodeCardProps) {
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-xl border overflow-hidden transition-colors ${
        isCurrentlyPlaying ? 'border-primary ring-1 ring-primary/20' : 'border-border'
      }`}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {isCurrentlyPlaying && (
                <Badge className="bg-primary text-primary-foreground font-mono text-xs flex items-center gap-1">
                  <Disc3 className="w-3 h-3 animate-spin" style={{ animationDuration: '2s' }} />
                  Sonando
                </Badge>
              )}
              {episode.eje && (
                <Badge variant="outline" className="font-mono text-xs">
                  {episode.eje}
                </Badge>
              )}
              {episode.duration_seconds && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(episode.duration_seconds)}
                </span>
              )}
              {episode.published_at && (
                <span className="text-xs text-muted-foreground">
                  {formatDate(episode.published_at)}
                </span>
              )}
            </div>
            <h3 className="font-serif text-xl text-foreground mb-2">
              {episode.title}
            </h3>
            {episode.description && (
              <p className="text-muted-foreground text-sm leading-relaxed">
                {episode.description}
              </p>
            )}
          </div>

          {/* Playing indicator */}
          {isCurrentlyPlaying && (
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <div className="flex items-center gap-0.5">
                <span className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-6 bg-primary rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

const Podcast = () => {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEpisodes = async () => {
      const { data, error } = await supabase
        .from('podcast_episodes')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false });

      if (error) {
        console.error('Error fetching episodes:', error);
      } else {
        setEpisodes(data || []);
      }
      setLoading(false);
    };

    fetchEpisodes();
  }, []);

  // Prepare episodes for radio player
  const radioEpisodes = episodes.map(ep => ({
    id: ep.id,
    title: ep.title,
    audio_url: ep.audio_url,
    duration_seconds: ep.duration_seconds,
  }));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <FogOverlay />
      <LagrangeNav />
      
      {/* Radio Player - fixed at top */}
      {episodes.length > 0 && (
        <RadioPlayer 
          episodes={radioEpisodes}
          onEpisodeChange={(id) => setCurrentPlayingId(id)}
        />
      )}
      
      <main className={`pb-8 md:pb-12 px-4 md:px-6 ${episodes.length > 0 ? 'pt-32 md:pt-36' : 'pt-20 md:pt-24'}`}>
        <div className="container mx-auto max-w-4xl">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 md:mb-12"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4 md:mb-6 glow-gold">
              <Headphones className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mb-3 md:mb-4">
              Radio Lagrange
            </h1>
            <p className="text-muted-foreground font-serif max-w-2xl mx-auto text-sm md:text-base">
              Emisión continua. Conversaciones que desestabilizan certezas. 
              Cada episodio es un nodo que se conecta con la topología del miedo y el control.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8"
          >
            <div className="p-3 md:p-4 rounded-xl bg-card border border-border text-center">
              <Radio className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1 md:mb-2 text-primary" />
              <span className="text-xl md:text-2xl font-mono text-foreground">{episodes.length}</span>
              <p className="text-xs text-muted-foreground mt-1">Episodios</p>
            </div>
            <div className="p-3 md:p-4 rounded-xl bg-card border border-border text-center">
              <Disc3 className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1 md:mb-2 text-lagrange-node" />
              <span className="text-xl md:text-2xl font-mono text-foreground">
                {episodes.filter(e => e.eje).map(e => e.eje).filter((v, i, a) => a.indexOf(v) === i).length}
              </span>
              <p className="text-xs text-muted-foreground mt-1">Ejes temáticos</p>
            </div>
          </motion.div>

          {/* Episodes list */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : episodes.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-border">
                <Mic className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground font-serif">
                  No hay episodios disponibles aún.
                </p>
              </div>
            ) : (
              episodes.map((episode, index) => (
                <motion.div
                  key={episode.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <EpisodeCard
                    episode={episode}
                    isCurrentlyPlaying={currentPlayingId === episode.id}
                  />
                </motion.div>
              ))
            )}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <p className="text-sm text-muted-foreground font-mono">
              Emisión 24/7. Cada episodio alimenta el mapa topológico. La fricción es intencional.
            </p>
          </motion.div>
        </div>
      </main>
      
      <LagrangeFooter />
    </div>
  );
};

export default Podcast;
