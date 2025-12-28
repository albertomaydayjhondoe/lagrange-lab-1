import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  fetchNodes, 
  fetchEdges, 
  LagrangeNode, 
  LagrangeEdge,
  fetchQuestionsForNode
} from '@/utils/dataService';
import { 
  registerInteraction, 
  calculateTensionState,
  TensionState 
} from '@/utils/narrativeMatrix';
import { saveInteraction } from '@/utils/interactionService';
import { Button } from '@/components/ui/button';
import { X, Zap, Link2, Brain, Filter } from 'lucide-react';

// Color mapping for axis types
const axisColors: Record<string, string> = {
  Miedo: 'var(--lagrange-tension)',
  Control: '35 90% 50%',
  SaludMental: 'var(--lagrange-calm)',
  Legitimidad: '220 70% 55%',
  Responsabilidad: '280 60% 55%',
};

const typeColors: Record<string, string> = {
  core: 'var(--primary)',
  mechanism: 'var(--lagrange-node)',
  biological: 'var(--lagrange-calm)',
  resistance: '280 60% 55%',
};

interface MapNodeProps {
  node: LagrangeNode;
  tensionState: TensionState;
  isSelected: boolean;
  isHighlighted: boolean;
  isFiltered: boolean;
  onClick: () => void;
  scale: number;
}

function MapNode({ node, tensionState, isSelected, isHighlighted, isFiltered, onClick, scale }: MapNodeProps) {
  const baseSize = 50;
  const sizeMultiplier = 1 + tensionState.currentWeight * 0.6;
  const size = baseSize * sizeMultiplier;
  
  const nodeColor = axisColors[node.axis] || 'var(--primary)';
  const opacity = isFiltered ? 1 : 0.2;

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity,
        scale: 1,
      }}
      transition={{ duration: 0.5, delay: Math.random() * 0.3 }}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    >
      {/* Outer glow for highlighted nodes */}
      {isHighlighted && (
        <motion.circle
          cx={node.x}
          cy={node.y}
          r={size * 1.2}
          fill="none"
          stroke={`hsl(${nodeColor})`}
          strokeWidth={2}
          opacity={0.6}
          animate={{
            r: [size * 1.1, size * 1.4, size * 1.1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
      
      {/* Pulsing glow effect */}
      <motion.circle
        cx={node.x}
        cy={node.y}
        r={size * 0.9}
        fill={`hsl(${nodeColor})`}
        opacity={0.15}
        animate={{
          r: [size * 0.8, size * 1.1, size * 0.8],
          opacity: [0.1, 0.25, 0.1],
        }}
        transition={{
          duration: 2 + tensionState.vibrationIntensity * 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Main node circle */}
      <motion.circle
        cx={node.x}
        cy={node.y}
        r={size / 2}
        fill="hsl(var(--card))"
        stroke={`hsl(${nodeColor})`}
        strokeWidth={isSelected ? 4 : 2}
        animate={{
          scale: isSelected ? 1.15 : 1,
        }}
        transition={{ duration: 0.2 }}
      />
      
      {/* Inner core - intensity based on tension */}
      <circle
        cx={node.x}
        cy={node.y}
        r={size / 4}
        fill={`hsl(${nodeColor})`}
        opacity={0.4 + tensionState.vibrationIntensity * 0.4}
      />
      
      {/* Type indicator dot */}
      {node.type && node.type !== 'core' && (
        <circle
          cx={node.x + size / 3}
          cy={node.y - size / 3}
          r={6}
          fill={`hsl(${typeColors[node.type] || 'var(--muted)'})`}
          stroke="hsl(var(--background))"
          strokeWidth={1}
        />
      )}
      
      {/* Label */}
      <text
        x={node.x}
        y={node.y + size / 2 + 18}
        textAnchor="middle"
        fill="hsl(var(--foreground))"
        fontSize={12 / scale}
        fontFamily="var(--font-serif)"
        opacity={0.9}
        fontWeight={isSelected ? 600 : 400}
      >
        {node.label}
      </text>
    </motion.g>
  );
}

interface MapEdgeProps {
  edge: LagrangeEdge;
  sourceNode: LagrangeNode;
  targetNode: LagrangeNode;
  isHighlighted: boolean;
  isFiltered: boolean;
}

function MapEdge({ edge, sourceNode, targetNode, isHighlighted, isFiltered }: MapEdgeProps) {
  const opacity = isFiltered ? (0.3 + edge.tension * 0.5) : 0.08;
  const strokeWidth = 1 + edge.tension * 3;
  
  // Calculate control point for curved edges
  const midX = (sourceNode.x + targetNode.x) / 2;
  const midY = (sourceNode.y + targetNode.y) / 2;
  const dx = targetNode.x - sourceNode.x;
  const dy = targetNode.y - sourceNode.y;
  const curvature = 0.15;
  const controlX = midX - dy * curvature;
  const controlY = midY + dx * curvature;

  const pathD = `M ${sourceNode.x} ${sourceNode.y} Q ${controlX} ${controlY} ${targetNode.x} ${targetNode.y}`;

  // Edge type colors
  const typeColorMap: Record<string, string> = {
    causal: 'var(--lagrange-tension)',
    consequence: 'var(--lagrange-gold)',
    enabler: 'var(--lagrange-node)',
    mechanism: '280 60% 55%',
    tension: 'var(--primary)',
    cycle: 'var(--lagrange-calm)',
  };

  const strokeColor = typeColorMap[edge.type || 'tension'] || 'var(--primary)';

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: isFiltered ? 1 : 0.3 }}
      transition={{ duration: 0.8 }}
    >
      {/* Main edge path */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={`hsl(${strokeColor})`}
        strokeWidth={strokeWidth}
        opacity={opacity}
        strokeLinecap="round"
        animate={isHighlighted ? {
          opacity: [opacity, opacity + 0.3, opacity],
          strokeWidth: [strokeWidth, strokeWidth + 1, strokeWidth],
        } : {}}
        transition={{
          duration: 1.5,
          repeat: isHighlighted ? Infinity : 0,
        }}
      />
      
      {/* Animated flow particles for high tension edges */}
      {edge.tension > 0.8 && isFiltered && (
        <motion.circle
          r={3}
          fill={`hsl(${strokeColor})`}
          opacity={0.8}
          animate={{
            offsetDistance: ['0%', '100%'],
          }}
          transition={{
            duration: 2 / edge.tension,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{
            offsetPath: `path("${pathD}")`,
          }}
        />
      )}
    </motion.g>
  );
}

interface NodeDetailPanelProps {
  node: LagrangeNode;
  tensionState: TensionState;
  connectedNodes: LagrangeNode[];
  onClose: () => void;
  onNavigateToNode: (nodeId: string) => void;
}

function NodeDetailPanel({ node, tensionState, connectedNodes, onClose, onNavigateToNode }: NodeDetailPanelProps) {
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    fetchQuestionsForNode(node.id).then(setQuestions);
  }, [node.id]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute top-4 right-4 w-96 max-h-[calc(100%-2rem)] overflow-hidden rounded-xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl"
    >
      {/* Header */}
      <div className="p-5 border-b border-border bg-secondary/30">
        <div className="flex items-start justify-between">
          <div>
            <span 
              className="inline-block px-2 py-0.5 rounded-full text-xs font-mono uppercase tracking-wider mb-2"
              style={{ 
                backgroundColor: `hsl(${axisColors[node.axis]} / 0.15)`,
                color: `hsl(${axisColors[node.axis]})`
              }}
            >
              {node.axis}
            </span>
            <h3 className="font-serif text-xl text-foreground">
              {node.label}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 -mt-1 -mr-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5 overflow-y-auto max-h-[400px]">
        <p className="text-muted-foreground text-sm leading-relaxed">
          {node.description}
        </p>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-secondary/50 text-center">
            <Zap className="w-4 h-4 mx-auto mb-1 text-lagrange-tension" />
            <div className="text-lg font-mono text-foreground">
              {(tensionState.currentWeight * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Peso</div>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50 text-center">
            <Brain className="w-4 h-4 mx-auto mb-1 text-lagrange-node" />
            <div className="text-lg font-mono text-foreground">
              {(tensionState.vibrationIntensity * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Intensidad</div>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50 text-center">
            <Link2 className="w-4 h-4 mx-auto mb-1 text-primary" />
            <div className="text-lg font-mono text-foreground">
              {tensionState.connectedTensions}
            </div>
            <div className="text-xs text-muted-foreground">Conexiones</div>
          </div>
        </div>

        {/* Connected nodes */}
        {connectedNodes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Nodos conectados</h4>
            <div className="flex flex-wrap gap-2">
              {connectedNodes.map(n => (
                <button
                  key={n.id}
                  onClick={() => onNavigateToNode(n.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-mono bg-secondary hover:bg-secondary/80 transition-colors"
                  style={{ 
                    borderLeft: `3px solid hsl(${axisColors[n.axis]})` 
                  }}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Questions preview */}
        {questions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">
              Preguntas socráticas ({questions.length})
            </h4>
            <div className="space-y-2">
              {questions.slice(0, 2).map((q, i) => (
                <div 
                  key={i}
                  className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm text-muted-foreground italic"
                >
                  "{q.texto}"
                </div>
              ))}
              {questions.length > 2 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{questions.length - 2} más preguntas
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function LagrangeMap() {
  const [nodes, setNodes] = useState<LagrangeNode[]>([]);
  const [edges, setEdges] = useState<LagrangeEdge[]>([]);
  const [tensionStates, setTensionStates] = useState<Map<string, TensionState>>(new Map());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [axisFilter, setAxisFilter] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    async function loadData() {
      const [loadedNodes, loadedEdges] = await Promise.all([
        fetchNodes(),
        fetchEdges()
      ]);
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      
      const states = new Map<string, TensionState>();
      loadedNodes.forEach(node => {
        states.set(node.id, calculateTensionState(node, loadedEdges));
      });
      setTensionStates(states);
    }
    loadData();
  }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    registerInteraction(nodeId);
    setSelectedNode(nodeId);
    
    // Persist interaction to database
    const tensionState = tensionStates.get(nodeId);
    saveInteraction({
      nodeId,
      interactionType: 'click',
      tensionLevel: tensionState?.currentWeight || 0,
    });
    
    setTensionStates(prev => {
      const newStates = new Map(prev);
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        newStates.set(nodeId, calculateTensionState(node, edges));
      }
      return newStates;
    });
  }, [nodes, edges, tensionStates]);

  const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null;

  // Get connected nodes for selected node
  const connectedNodes = useMemo(() => {
    if (!selectedNode) return [];
    const connectedIds = new Set<string>();
    edges.forEach(edge => {
      if (edge.source === selectedNode) connectedIds.add(edge.target);
      if (edge.target === selectedNode) connectedIds.add(edge.source);
    });
    return nodes.filter(n => connectedIds.has(n.id));
  }, [selectedNode, edges, nodes]);

  // Check if node/edge should be highlighted (connected to selected)
  const isNodeHighlighted = useCallback((nodeId: string) => {
    if (!selectedNode) return false;
    return connectedNodes.some(n => n.id === nodeId) || nodeId === selectedNode;
  }, [selectedNode, connectedNodes]);

  const isEdgeHighlighted = useCallback((edge: LagrangeEdge) => {
    if (!selectedNode) return false;
    return edge.source === selectedNode || edge.target === selectedNode;
  }, [selectedNode]);

  // Filter logic
  const isNodeFiltered = useCallback((node: LagrangeNode) => {
    if (!axisFilter) return true;
    return node.axis === axisFilter;
  }, [axisFilter]);

  const isEdgeFiltered = useCallback((edge: LagrangeEdge) => {
    if (!axisFilter) return true;
    const source = nodes.find(n => n.id === edge.source);
    const target = nodes.find(n => n.id === edge.target);
    return (source?.axis === axisFilter) || (target?.axis === axisFilter);
  }, [axisFilter, nodes]);

  // Unique axes for filter
  const uniqueAxes = useMemo(() => {
    const axes = new Set(nodes.map(n => n.axis));
    return Array.from(axes);
  }, [nodes]);

  // Zoom handlers
  const handleZoom = useCallback((delta: number) => {
    setScale(prev => Math.max(0.5, Math.min(2, prev + delta)));
  }, []);

  return (
    <div className="relative w-full h-full min-h-[600px]">
      {/* Filter controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
        <Button
          variant={axisFilter === null ? "default" : "outline"}
          size="sm"
          onClick={() => setAxisFilter(null)}
          className="h-8 text-xs font-mono"
        >
          <Filter className="w-3 h-3 mr-1" />
          Todos
        </Button>
        {uniqueAxes.map(axis => (
          <Button
            key={axis}
            variant={axisFilter === axis ? "default" : "outline"}
            size="sm"
            onClick={() => setAxisFilter(axis === axisFilter ? null : axis)}
            className="h-8 text-xs font-mono"
            style={axisFilter === axis ? {
              backgroundColor: `hsl(${axisColors[axis]})`,
              borderColor: `hsl(${axisColors[axis]})`,
            } : {}}
          >
            {axis}
          </Button>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-4 z-10 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleZoom(0.1)}
          className="h-8 w-8 p-0 font-mono"
        >
          +
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleZoom(-0.1)}
          className="h-8 w-8 p-0 font-mono"
        >
          −
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
          className="h-8 px-2 text-xs font-mono"
        >
          Reset
        </Button>
      </div>

      {/* SVG Map */}
      <svg
        viewBox={`${-pan.x} ${-pan.y} ${800 / scale} ${600 / scale}`}
        className="w-full h-full"
        style={{ background: 'transparent' }}
      >
        <defs>
          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        <g className="edges">
          {edges.map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;
            
            return (
              <MapEdge
                key={edge.id}
                edge={edge}
                sourceNode={sourceNode}
                targetNode={targetNode}
                isHighlighted={isEdgeHighlighted(edge)}
                isFiltered={isEdgeFiltered(edge)}
              />
            );
          })}
        </g>
        
        {/* Nodes */}
        <g className="nodes">
          {nodes.map(node => (
            <MapNode
              key={node.id}
              node={node}
              tensionState={tensionStates.get(node.id) || {
                nodeId: node.id,
                currentWeight: node.weight,
                vibrationIntensity: 0.5,
                connectedTensions: 0
              }}
              isSelected={selectedNode === node.id}
              isHighlighted={isNodeHighlighted(node.id)}
              isFiltered={isNodeFiltered(node)}
              onClick={() => handleNodeClick(node.id)}
              scale={scale}
            />
          ))}
        </g>
      </svg>

      {/* Selected node detail panel */}
      <AnimatePresence>
        {selectedNodeData && (
          <NodeDetailPanel
            node={selectedNodeData}
            tensionState={tensionStates.get(selectedNodeData.id) || {
              nodeId: selectedNodeData.id,
              currentWeight: selectedNodeData.weight,
              vibrationIntensity: 0.5,
              connectedTensions: 0
            }}
            connectedNodes={connectedNodes}
            onClose={() => setSelectedNode(null)}
            onNavigateToNode={handleNodeClick}
          />
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 p-4 rounded-xl bg-card/80 backdrop-blur-sm border border-border">
        <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Leyenda</h4>
        <div className="space-y-2">
          {Object.entries(axisColors).slice(0, 5).map(([axis, color]) => (
            <div key={axis} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: `hsl(${color})` }}
              />
              <span className="text-xs text-muted-foreground">{axis}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
