import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/compartido/lib/supabaseClient';
import { useAcademyId } from '@/caracteristicas/academia/AcademyContext';

export interface TopologyNode {
  id: string;
  label: string;
  description: string | null;
  x: number;
  y: number;
  weight: number;
  color: string;
  axis: string;
  type: string;
  corpus_refs?: string[] | null;
  question_count?: number | null;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  tension: number;
  label: string | null;
  type: string;
}

interface TopologyDelta {
  addedNodes: TopologyNode[];
  removedNodes: string[];
  modifiedNodes: TopologyNode[];
  addedEdges: TopologyEdge[];
  removedEdges: string[];
  modifiedEdges: TopologyEdge[];
}

/**
 * Hook to track topology changes between updates
 * Used for animations and incremental updates
 */
export function useTopologyDelta(academyIdOverride?: string | null) {
  const academyIdFromContext = useAcademyId();
  const academyId = academyIdOverride || academyIdFromContext;
  
  const [previousNodes, setPreviousNodes] = useState<TopologyNode[]>([]);
  const [previousEdges, setPreviousEdges] = useState<TopologyEdge[]>([]);
  const [delta, setDelta] = useState<TopologyDelta | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTopology = useCallback(async () => {
    if (!academyId) return { nodes: [], edges: [] };

    setLoading(true);
    
    const [nodesRes, edgesRes] = await Promise.all([
      supabase
        .from('topology_nodes')
        .select('*')
        .eq('academy_id', academyId),
      supabase
        .from('topology_edges')
        .select('*')
        .eq('academy_id', academyId),
    ]);

    setLoading(false);

    const nodes = (nodesRes.data || []) as TopologyNode[];
    const edges = (edgesRes.data || []) as TopologyEdge[];

    return { nodes, edges };
  }, [academyId]);

  // Update previous state when nodes/edges change
  const updateTopology = useCallback(async () => {
    const { nodes, edges } = await fetchTopology();

    // Calculate delta
    const previousNodeIds = new Set(previousNodes.map(n => n.id));
    const currentNodeIds = new Set(nodes.map(n => n.id));
    
    const addedNodes = nodes.filter(n => !previousNodeIds.has(n.id));
    const removedNodes = previousNodes.filter(n => !currentNodeIds.has(n.id)).map(n => n.id);
    const modifiedNodes = nodes.filter(n => {
      const prev = previousNodes.find(p => p.id === n.id);
      return prev && (prev.label !== n.label || prev.description !== n.description || prev.x !== n.x || prev.y !== n.y);
    });

    const previousEdgeIds = new Set(previousEdges.map(e => e.id));
    const currentEdgeIds = new Set(edges.map(e => e.id));
    
    const addedEdges = edges.filter(e => !previousEdgeIds.has(e.id));
    const removedEdges = previousEdges.filter(e => !currentEdgeIds.has(e.id)).map(e => e.id);
    const modifiedEdges = edges.filter(e => {
      const prev = previousEdges.find(p => p.id === e.id);
      return prev && (prev.label !== e.label || prev.tension !== e.tension || prev.type !== e.type);
    });

    setDelta({
      addedNodes,
      removedNodes,
      modifiedNodes,
      addedEdges,
      removedEdges,
      modifiedEdges,
    });

    // Update previous state for next comparison
    setPreviousNodes(nodes);
    setPreviousEdges(edges);

    return delta;
  }, [fetchTopology, previousNodes, previousEdges, delta]);

  // Initial fetch
  useEffect(() => {
    if (academyId) {
      fetchTopology().then(({ nodes, edges }) => {
        setPreviousNodes(nodes);
        setPreviousEdges(edges);
      });
    }
  }, [academyId, fetchTopology]);

  return {
    delta,
    updateTopology,
    loading,
    previousNodes,
    previousEdges,
  };
}
