import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  fetchNodes, 
  fetchEdges, 
  LagrangeNode, 
  LagrangeEdge 
} from '@/utils/dataService';
import { 
  registerInteraction, 
  calculateTensionState,
  TensionState 
} from '@/utils/narrativeMatrix';

interface MapNodeProps {
  node: LagrangeNode;
  tensionState: TensionState;
  isSelected: boolean;
  onClick: () => void;
}

function MapNode({ node, tensionState, isSelected, onClick }: MapNodeProps) {
  const colorMap: Record<string, string> = {
    tension: 'var(--lagrange-tension)',
    node: 'var(--lagrange-node)',
    calm: 'var(--lagrange-calm)',
    gold: 'var(--lagrange-gold)',
  };

  const baseSize = 60;
  const sizeMultiplier = 1 + tensionState.currentWeight * 0.5;
  const size = baseSize * sizeMultiplier;

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
      }}
      transition={{ duration: 0.5, delay: Math.random() * 0.3 }}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    >
      {/* Glow effect */}
      <motion.circle
        cx={node.x}
        cy={node.y}
        r={size * 0.8}
        fill={`hsl(${colorMap[node.color]})`}
        opacity={0.1}
        animate={{
          r: [size * 0.8, size * 1.2, size * 0.8],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 2 + tensionState.vibrationIntensity,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Main node */}
      <motion.circle
        cx={node.x}
        cy={node.y}
        r={size / 2}
        fill="hsl(var(--card))"
        stroke={`hsl(${colorMap[node.color]})`}
        strokeWidth={isSelected ? 3 : 2}
        animate={{
          scale: isSelected ? 1.1 : 1,
        }}
      />
      
      {/* Inner glow */}
      <circle
        cx={node.x}
        cy={node.y}
        r={size / 4}
        fill={`hsl(${colorMap[node.color]})`}
        opacity={0.3 + tensionState.vibrationIntensity * 0.3}
      />
      
      {/* Label */}
      <text
        x={node.x}
        y={node.y + size / 2 + 20}
        textAnchor="middle"
        fill="hsl(var(--foreground))"
        fontSize="14"
        fontFamily="var(--font-serif)"
        opacity={0.9}
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
}

function MapEdge({ edge, sourceNode, targetNode }: MapEdgeProps) {
  const opacity = 0.2 + edge.tension * 0.4;
  
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <line
        x1={sourceNode.x}
        y1={sourceNode.y}
        x2={targetNode.x}
        y2={targetNode.y}
        stroke="hsl(var(--primary))"
        strokeWidth={1 + edge.tension * 2}
        opacity={opacity}
        strokeDasharray={edge.tension > 0.8 ? "none" : "5,5"}
      />
    </motion.g>
  );
}

export function LagrangeMap() {
  const [nodes, setNodes] = useState<LagrangeNode[]>([]);
  const [edges, setEdges] = useState<LagrangeEdge[]>([]);
  const [tensionStates, setTensionStates] = useState<Map<string, TensionState>>(new Map());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const [loadedNodes, loadedEdges] = await Promise.all([
        fetchNodes(),
        fetchEdges()
      ]);
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      
      // Calculate initial tension states
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
    
    // Recalculate tension states
    setTensionStates(prev => {
      const newStates = new Map(prev);
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        newStates.set(nodeId, calculateTensionState(node, edges));
      }
      return newStates;
    });
  }, [nodes, edges]);

  const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null;

  return (
    <div className="relative w-full h-full min-h-[600px]">
      <svg
        viewBox="0 0 800 600"
        className="w-full h-full"
        style={{ background: 'transparent' }}
      >
        {/* Edges */}
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
            />
          );
        })}
        
        {/* Nodes */}
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
            onClick={() => handleNodeClick(node.id)}
          />
        ))}
      </svg>

      {/* Selected node info panel */}
      {selectedNodeData && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-4 right-4 w-80 p-6 rounded-xl bg-card/90 backdrop-blur-lg border border-border"
        >
          <h3 className="font-serif text-xl text-primary mb-2">
            {selectedNodeData.label}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {selectedNodeData.description}
          </p>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Peso actual</span>
              <span className="text-foreground font-mono">
                {(tensionStates.get(selectedNodeData.id)?.currentWeight || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-muted-foreground">Intensidad</span>
              <span className="text-foreground font-mono">
                {(tensionStates.get(selectedNodeData.id)?.vibrationIntensity || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
