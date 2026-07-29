/**
 * SourcesPanel.tsx
 * 
 * Panel de UI para mostrar procedencia (provenance) de fuentes RAG.
 * Implementa el flujo PROVENANCE del flowchart:
 * P1: Fragmento exacto usado
 * P2: Formato original (PDF pág X / min Y del video / URL)
 * P3: Similitud semántica (score 0-1)
 * P4: Modelo IA + timestamp
 * P5: Marca de inferencia sin respaldo directo
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/compartido/ui/card';
import { Badge } from '@/compartido/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/compartido/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/compartido/ui/collapsible';
import { 
  BookOpen, 
  Quote, 
  Link as LinkIcon, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  FileText,
  Video,
  Music,
  Image,
  Globe,
  FileSpreadsheet
} from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

export interface ProvenanceEntry {
  fragment_id: string;
  source_file: string;
  source_type: string;
  source_content: string;
  original_url?: string;
  page_reference?: string;
  similarity_score: number;
  citation_order: number;
  is_inference_only: boolean;
  ingested_at?: string;
  uploaded_by?: string;
}

export interface WikipediaProvenance {
  title: string;
  url: string;
  used: boolean;
  note?: string;
}

interface SourcesPanelProps {
  provenance: ProvenanceEntry[];
  wikipedia?: WikipediaProvenance;
  hasInferenceOnly?: boolean;
  totalSources?: number;
  compact?: boolean;
  onSourceClick?: (source: ProvenanceEntry) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function getSourceIcon(sourceType?: string) {
  switch (sourceType?.toLowerCase()) {
    case 'pdf':
      return FileText;
    case 'docx':
    case 'txt':
    case 'md':
      return FileText;
    case 'video':
      return Video;
    case 'audio':
      return Music;
    case 'imagen':
    case 'image':
      return Image;
    case 'url':
      return Globe;
    case 'csv':
      return FileSpreadsheet;
    default:
      return BookOpen;
  }
}

function getSourceIconColor(sourceType?: string): string {
  switch (sourceType?.toLowerCase()) {
    case 'pdf':
      return 'text-red-500';
    case 'docx':
      return 'text-blue-500';
    case 'video':
      return 'text-purple-500';
    case 'audio':
      return 'text-orange-500';
    case 'imagen':
      return 'text-green-500';
    case 'url':
      return 'text-cyan-500';
    case 'csv':
      return 'text-emerald-500';
    default:
      return 'text-gray-500';
  }
}

function getSimilarityColor(score: number): string {
  if (score >= 0.85) return 'text-emerald-500';
  if (score >= 0.70) return 'text-amber-500';
  return 'text-red-500';
}

function formatDate(dateString?: string): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

function truncateText(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// =============================================================================
// COMPONENTES
// =============================================================================

/**
 * Indicador de similitud con barra visual
 */
function SimilarityIndicator({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const colorClass = getSimilarityColor(score);
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${colorClass.replace('text-', 'bg-')}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-xs font-mono ${colorClass}`}>
        {percentage}%
      </span>
    </div>
  );
}

/**
 * Badge de tipo de fuente
 */
function SourceTypeBadge({ type }: { type: string }) {
  const Icon = getSourceIcon(type);
  const colorClass = getSourceIconColor(type);
  
  return (
    <Badge variant="outline" className={`gap-1 ${colorClass}`}>
      <Icon className="w-3 h-3" />
      {type.toUpperCase()}
    </Badge>
  );
}

/**
 * Entrada individual de fuente en el panel
 */
function SourceEntry({ 
  source, 
  onClick,
  expanded = false 
}: { 
  source: ProvenanceEntry;
  onClick?: () => void;
  expanded?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(expanded);
  const Icon = getSourceIcon(source.source_type);
  const colorClass = getSourceIconColor(source.source_type);
  
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className={`mt-0.5 ${colorClass}`}>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{source.source_file}</span>
            <SourceTypeBadge type={source.source_type} />
          </div>
          
          {source.page_reference && (
            <p className="text-xs text-muted-foreground mt-1">
              📌 {source.page_reference}
            </p>
          )}
          
          {source.original_url && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              <LinkIcon className="w-3 h-3 inline mr-1" />
              {new URL(source.original_url).hostname}
            </p>
          )}
          
          <SimilarityIndicator score={source.similarity_score} />
        </div>
        
        {onClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="text-primary hover:text-primary/80 p-1"
            title="Ver en contexto"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0">
              <div className="border-t border-border pt-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Quote className="w-3 h-3" />
                  <span>Fragmento citado (#{source.citation_order})</span>
                </div>
                
                <blockquote className="text-sm bg-muted/50 p-3 rounded-lg border-l-2 border-primary/50 italic">
                  "{truncateText(source.source_content, 500)}"
                </blockquote>
                
                {source.ingested_at && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Ingerido: {formatDate(source.ingested_at)}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Panel de Wikipedia (fuente externa)
 */
function WikipediaPanel({ wikipedia }: { wikipedia: WikipediaProvenance }) {
  if (!wikipedia.used) return null;
  
  return (
    <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-3">
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
        <Globe className="w-4 h-4" />
        <span className="font-medium text-sm">📚 Fuente externa</span>
      </div>
      
      <p className="text-sm mb-2">
        <span className="font-medium">{wikipedia.title}</span>
      </p>
      
      {wikipedia.url && (
        <a 
          href={wikipedia.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          {wikipedia.url}
        </a>
      )}
      
      {wikipedia.note && (
        <p className="text-xs text-muted-foreground mt-2 italic">
          {wikipedia.note}
        </p>
      )}
    </div>
  );
}

/**
 * Indicador de inferencia sin fuente
 */
function InferenceWarning({ show }: { show?: boolean }) {
  if (!show) return null;
  
  return (
    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
      <AlertTriangle className="w-4 h-4" />
      <span>Parte de la respuesta contiene inferencia sin fuente propia</span>
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function SourcesPanel({ 
  provenance, 
  wikipedia,
  hasInferenceOnly,
  totalSources,
  compact = false,
  onSourceClick 
}: SourcesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  
  if (!provenance || provenance.length === 0) {
    return null;
  }
  
  const sortedProvenance = [...provenance].sort((a, b) => a.citation_order - b.citation_order);
  
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Fuentes usadas</span>
          <Badge variant="secondary">
            {totalSources ?? provenance.length}
          </Badge>
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? 'Contraer' : 'Expandir'}
        </button>
      </div>
      
      {/* Wikipedia provenance */}
      {wikipedia?.used && <WikipediaPanel wikipedia={wikipedia} />}
      
      {/* Inference warning */}
      <InferenceWarning show={hasInferenceOnly} />
      
      {/* Sources list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Accordion type="single" collapsible className="w-full">
              {sortedProvenance.map((source, index) => (
                <AccordionItem key={source.fragment_id} value={`source-${index}`}>
                  <AccordionTrigger className="px-3 py-2 hover:no-underline">
                    <div className="flex items-center gap-2 text-left">
                      <span className="text-muted-foreground text-xs font-mono">
                        #{source.citation_order}
                      </span>
                      <span className="font-medium text-sm truncate">
                        {source.source_file}
                      </span>
                      <SourceTypeBadge type={source.source_type} />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="px-3 pb-3 space-y-2">
                      {/* Metadata */}
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {source.page_reference && (
                          <span className="flex items-center gap-1">
                            📌 {source.page_reference}
                          </span>
                        )}
                        {source.original_url && (
                          <a 
                            href={source.original_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {new URL(source.original_url).hostname}
                          </a>
                        )}
                      </div>
                      
                      {/* Similarity */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Similitud:</span>
                        <SimilarityIndicator score={source.similarity_score} />
                      </div>
                      
                      {/* Content preview */}
                      <blockquote className="text-sm bg-muted/50 p-3 rounded-lg border-l-2 border-primary/50">
                        "{truncateText(source.source_content, 300)}"
                      </blockquote>
                      
                      {/* Actions */}
                      {onSourceClick && (
                        <button
                          onClick={() => onSourceClick(source)}
                          className="text-xs text-primary hover:underline"
                        >
                          Ver fragmento completo →
                        </button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Compact view */}
      {!isExpanded && (
        <div className="flex flex-wrap gap-2">
          {sortedProvenance.map((source) => (
            <button
              key={source.fragment_id}
              onClick={() => onSourceClick?.(source)}
              className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-full text-xs hover:bg-muted transition-colors"
            >
              <span className="text-muted-foreground font-mono">#{source.citation_order}</span>
              <span className="truncate max-w-[150px]">{source.source_file}</span>
              <span className={`${getSourceIconColor(source.source_type)}`}>
                <Icon className="w-3 h-3" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Versión compact del panel para integrar en mensajes de chat
 */
export function CompactSourcesBadge({ 
  provenance,
  wikipedia
}: { 
  provenance: ProvenanceEntry[];
  wikipedia?: WikipediaProvenance;
}) {
  if (!provenance || provenance.length === 0) {
    if (wikipedia?.used) {
      return (
        <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/30">
          <Globe className="w-3 h-3" />
          Wikipedia
        </Badge>
      );
    }
    return null;
  }
  
  return (
    <div className="flex flex-wrap gap-1">
      {provenance.slice(0, 3).map((source) => {
        const Icon = getSourceIcon(source.source_type);
        const colorClass = getSourceIconColor(source.source_type);
        
        return (
          <Badge 
            key={source.fragment_id}
            variant="outline" 
            className={`gap-1 ${colorClass}`}
          >
            <Icon className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{source.source_file}</span>
          </Badge>
        );
      })}
      
      {provenance.length > 3 && (
        <Badge variant="outline" className="gap-1">
          +{provenance.length - 3} más
        </Badge>
      )}
    </div>
  );
}

export default SourcesPanel;
