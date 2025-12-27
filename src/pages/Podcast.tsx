import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LagrangeNav } from '@/components/LagrangeNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchEpisodes, Episode, getNodeById } from '@/utils/dataService';
import { 
  Play, 
  Pause, 
  Clock, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Network,
  Mic,
  Radio
} from 'lucide-react';

interface EpisodeCardProps {
  episode: Episode;
  isExpanded: boolean;
  isPlaying: boolean;
  onToggleExpand: () => void;
  onTogglePlay: () => void;
}

function EpisodeCard({ episode, isExpanded, isPlaying, onToggleExpand, onTogglePlay }: EpisodeCardProps) {
  const connectedNodes = episode.nodes?.map(nodeId => getNodeById(nodeId)).filter(Boolean) || [];

  const statusColors = {
    pendiente: 'bg-muted text-muted-foreground',
    activo: 'bg-primary/20 text-primary',
    completo: 'bg-lagrange-calm/20 text-lagrange-calm',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border overflow-hidden"
    >
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={statusColors[episode.status]}>
                {episode.status}
              </Badge>
              {episode.duration && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {episode.duration}
                </span>
              )}
            </div>
            <h3 className="font-serif text-xl text-foreground mb-2">
              {episode.title}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {episode.description}
            </p>
          </div>

          {/* Play button */}
          <Button
            variant="outline"
            size="icon"
            onClick={onTogglePlay}
            disabled={!episode.audioFile}
            className={`h-14 w-14 rounded-full ${isPlaying ? 'bg-primary text-primary-foreground' : ''}`}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </Button>
        </div>

        {/* Connected nodes */}
        {connectedNodes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {connectedNodes.map(node => node && (
              <span
                key={node.id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-xs font-mono"
              >
                <Network className="w-3 h-3" />
                {node.label}
              </span>
            ))}
          </div>
        )}

        {/* Expand button */}
        {episode.transcript && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            className="mt-4 w-full justify-center gap-2 font-mono text-xs"
          >
            <FileText className="w-4 h-4" />
            {isExpanded ? 'Ocultar transcripción' : 'Ver transcripción'}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {/* Transcript */}
      <AnimatePresence>
        {isExpanded && episode.transcript && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2 border-t border-border">
              <div className="bg-secondary/50 rounded-lg p-4 max-h-80 overflow-y-auto">
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-serif leading-relaxed">
                  {episode.transcript}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const Podcast = () => {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [expandedEpisode, setExpandedEpisode] = useState<string | null>(null);
  const [playingEpisode, setPlayingEpisode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEpisodes().then(data => {
      setEpisodes(data);
      setLoading(false);
    });
  }, []);

  const handleToggleExpand = (episodeId: string) => {
    setExpandedEpisode(prev => prev === episodeId ? null : episodeId);
  };

  const handleTogglePlay = (episodeId: string) => {
    setPlayingEpisode(prev => prev === episodeId ? null : episodeId);
  };

  const activeCount = episodes.filter(e => e.status === 'activo').length;
  const completeCount = episodes.filter(e => e.status === 'completo').length;

  return (
    <div className="min-h-screen bg-background">
      <LagrangeNav />
      
      <main className="pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-4xl">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6 glow-gold">
              <Mic className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
              El Podcast
            </h1>
            <p className="text-muted-foreground font-serif max-w-2xl mx-auto">
              Conversaciones que desestabilizan certezas. Cada episodio es un nodo 
              que se conecta con la topología del miedo y el control.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-4 mb-8"
          >
            <div className="p-4 rounded-xl bg-card border border-border text-center">
              <Radio className="w-5 h-5 mx-auto mb-2 text-primary" />
              <span className="text-2xl font-mono text-foreground">{episodes.length}</span>
              <p className="text-xs text-muted-foreground mt-1">Episodios</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border text-center">
              <Play className="w-5 h-5 mx-auto mb-2 text-lagrange-node" />
              <span className="text-2xl font-mono text-foreground">{activeCount}</span>
              <p className="text-xs text-muted-foreground mt-1">Activos</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border text-center">
              <FileText className="w-5 h-5 mx-auto mb-2 text-lagrange-calm" />
              <span className="text-2xl font-mono text-foreground">{completeCount}</span>
              <p className="text-xs text-muted-foreground mt-1">Completos</p>
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
                    isExpanded={expandedEpisode === episode.id}
                    isPlaying={playingEpisode === episode.id}
                    onToggleExpand={() => handleToggleExpand(episode.id)}
                    onTogglePlay={() => handleTogglePlay(episode.id)}
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
              Cada episodio alimenta el mapa topológico. La fricción es intencional.
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Podcast;
