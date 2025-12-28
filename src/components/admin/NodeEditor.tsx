import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Edit2, X, Sparkles, Loader2, Brain, Lightbulb } from 'lucide-react';
import { fetchAxes, ThematicAxis } from '@/utils/dataService';
import { aiAnalyzeNode, aiSuggestNode, aiDescribeNode } from '@/utils/aiStructuralService';

interface TopologyNode {
  id: string;
  label: string;
  description: string | null;
  x: number;
  y: number;
  weight: number;
  color: string;
  axis: string;
  type: string;
  corpus_refs: string[] | null;
  question_count: number | null;
}

interface NodeEditorProps {
  nodes: TopologyNode[];
  onRefresh: () => void;
  isAdmin: boolean;
}

export const NodeEditor = ({ nodes, onRefresh, isAdmin }: NodeEditorProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<TopologyNode>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [axes, setAxes] = useState<ThematicAxis[]>([]);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<any>(null);
  const [newNode, setNewNode] = useState<Partial<TopologyNode>>({
    id: '',
    label: '',
    description: '',
    x: 400,
    y: 300,
    weight: 0.5,
    color: '#3b82f6',
    axis: '',
    type: 'core',
    corpus_refs: [],
    question_count: 0
  });

  useEffect(() => {
    fetchAxes().then(data => {
      setAxes(data);
      if (data.length > 0 && !newNode.axis) {
        setNewNode(prev => ({ ...prev, axis: data[0].id, color: data[0].color }));
      }
    });
  }, []);

  const startEdit = (node: TopologyNode) => {
    setEditingId(node.id);
    setEditData(node);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    
    const { error } = await supabase
      .from('topology_nodes')
      .update({
        label: editData.label,
        description: editData.description,
        x: editData.x,
        y: editData.y,
        weight: editData.weight,
        color: editData.color,
        axis: editData.axis,
        type: editData.type,
        corpus_refs: editData.corpus_refs,
        question_count: editData.question_count
      })
      .eq('id', editingId);

    if (error) {
      toast.error('Error al guardar: ' + error.message);
    } else {
      toast.success('Nodo actualizado');
      cancelEdit();
      onRefresh();
    }
  };

  const deleteNode = async (id: string) => {
    if (!confirm('¿Eliminar este nodo? Esto también eliminará sus conexiones.')) return;
    
    const { error } = await supabase
      .from('topology_nodes')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error al eliminar: ' + error.message);
    } else {
      toast.success('Nodo eliminado');
      onRefresh();
    }
  };

  const createNode = async () => {
    if (!newNode.id || !newNode.label || !newNode.axis) {
      toast.error('ID, Label y Axis son requeridos');
      return;
    }

    const { error } = await supabase
      .from('topology_nodes')
      .insert([newNode as TopologyNode]);

    if (error) {
      toast.error('Error al crear: ' + error.message);
    } else {
      toast.success('Nodo creado');
      setIsCreating(false);
      const defaultAxis = axes[0];
      setNewNode({
        id: '',
        label: '',
        description: '',
        x: 400,
        y: 300,
        weight: 0.5,
        color: defaultAxis?.color || '#3b82f6',
        axis: defaultAxis?.id || '',
        type: 'core',
        corpus_refs: [],
        question_count: 0
      });
      onRefresh();
    }
  };

  const handleAiAnalyze = async (nodeId: string) => {
    setAiLoading(nodeId);
    setAiResult(null);
    try {
      const result = await aiAnalyzeNode(nodeId);
      setAiResult({ type: 'analyze', nodeId, data: result });
      toast.success('Análisis completado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error en análisis IA');
    } finally {
      setAiLoading(null);
    }
  };

  const handleAiDescribe = async (nodeId: string) => {
    setAiLoading(nodeId);
    try {
      const result = await aiDescribeNode(nodeId);
      // Apply description to edit data
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        setEditingId(nodeId);
        setEditData({ ...node, description: result.description_short });
      }
      toast.success('Descripción generada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error generando descripción');
    } finally {
      setAiLoading(null);
    }
  };

  const handleAiSuggest = async () => {
    setAiLoading('suggest');
    try {
      const result = await aiSuggestNode();
      const selectedAxis = axes.find(a => a.id === result.axis);
      setNewNode({
        id: result.id,
        label: result.label,
        description: result.description,
        x: 400,
        y: 300,
        weight: 0.7,
        color: selectedAxis?.color || '#3b82f6',
        axis: result.axis,
        type: result.type,
        corpus_refs: [],
        question_count: 0
      });
      setIsCreating(true);
      toast.success('Nodo sugerido por IA');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error en sugerencia IA');
    } finally {
      setAiLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end gap-2 flex-wrap">
          <Button
            onClick={handleAiSuggest}
            variant="outline"
            className="gap-2"
            disabled={aiLoading === 'suggest'}
          >
            {aiLoading === 'suggest' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
            IA Sugerir Nodo
          </Button>
          <Button
            onClick={() => setIsCreating(!isCreating)}
            variant={isCreating ? "outline" : "default"}
            className="gap-2"
          >
            {isCreating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isCreating ? 'Cancelar' : 'Nuevo Nodo'}
          </Button>
        </div>
      )}

      {aiResult && aiResult.type === 'analyze' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/10 border border-primary/30 rounded-lg p-4 space-y-3"
        >
          <div className="flex justify-between items-start">
            <h4 className="font-semibold text-primary flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Análisis IA: {aiResult.nodeId}
            </h4>
            <Button size="sm" variant="ghost" onClick={() => setAiResult(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm">{aiResult.data.analisis}</p>
          {aiResult.data.tensiones?.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-muted-foreground">Tensiones detectadas:</span>
              <ul className="text-sm list-disc list-inside">
                {aiResult.data.tensiones.map((t: string, i: number) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
          {aiResult.data.preguntas?.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-muted-foreground">Preguntas sugeridas:</span>
              <ul className="text-sm list-disc list-inside italic">
                {aiResult.data.preguntas.map((p: string, i: number) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {isCreating && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-secondary/50 rounded-lg p-4 space-y-3"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input
              placeholder="ID único"
              value={newNode.id}
              onChange={(e) => setNewNode({ ...newNode, id: e.target.value })}
            />
            <Input
              placeholder="Label"
              value={newNode.label}
              onChange={(e) => setNewNode({ ...newNode, label: e.target.value })}
            />
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newNode.axis}
              onChange={(e) => {
                const selectedAxis = axes.find(a => a.id === e.target.value);
                setNewNode({ 
                  ...newNode, 
                  axis: e.target.value,
                  color: selectedAxis?.color || newNode.color
                });
              }}
            >
              {axes.map(axis => (
                <option key={axis.id} value={axis.id}>{axis.label}</option>
              ))}
            </select>
            <Input
              placeholder="Color (#hex)"
              value={newNode.color}
              onChange={(e) => setNewNode({ ...newNode, color: e.target.value })}
            />
          </div>
          <Textarea
            placeholder="Descripción"
            value={newNode.description || ''}
            onChange={(e) => setNewNode({ ...newNode, description: e.target.value })}
          />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Input
              type="number"
              placeholder="X"
              value={newNode.x}
              onChange={(e) => setNewNode({ ...newNode, x: parseInt(e.target.value) })}
            />
            <Input
              type="number"
              placeholder="Y"
              value={newNode.y}
              onChange={(e) => setNewNode({ ...newNode, y: parseInt(e.target.value) })}
            />
            <Input
              type="number"
              placeholder="Weight (0-1)"
              step="0.01"
              value={newNode.weight}
              onChange={(e) => setNewNode({ ...newNode, weight: parseFloat(e.target.value) })}
            />
            <Input
              placeholder="Type"
              value={newNode.type}
              onChange={(e) => setNewNode({ ...newNode, type: e.target.value })}
            />
            <Button onClick={createNode} className="gap-2">
              <Save className="w-4 h-4" />
              Crear
            </Button>
          </div>
        </motion.div>
      )}

      <div className="space-y-2">
        {nodes.map((node) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card border border-border rounded-lg p-4"
          >
            {editingId === node.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Input
                    value={editData.label || ''}
                    onChange={(e) => setEditData({ ...editData, label: e.target.value })}
                    placeholder="Label"
                  />
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editData.axis || ''}
                    onChange={(e) => {
                      const selectedAxis = axes.find(a => a.id === e.target.value);
                      setEditData({ 
                        ...editData, 
                        axis: e.target.value,
                        color: selectedAxis?.color || editData.color
                      });
                    }}
                  >
                    {axes.map(axis => (
                      <option key={axis.id} value={axis.id}>{axis.label}</option>
                    ))}
                  </select>
                  <Input
                    value={editData.color || ''}
                    onChange={(e) => setEditData({ ...editData, color: e.target.value })}
                    placeholder="Color"
                  />
                  <Input
                    value={editData.type || ''}
                    onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                    placeholder="Type"
                  />
                </div>
                <Textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  placeholder="Descripción"
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Input
                    type="number"
                    value={editData.x}
                    onChange={(e) => setEditData({ ...editData, x: parseInt(e.target.value) })}
                    placeholder="X"
                  />
                  <Input
                    type="number"
                    value={editData.y}
                    onChange={(e) => setEditData({ ...editData, y: parseInt(e.target.value) })}
                    placeholder="Y"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={editData.weight}
                    onChange={(e) => setEditData({ ...editData, weight: parseFloat(e.target.value) })}
                    placeholder="Weight"
                  />
                  <div className="flex gap-2">
                    <Button onClick={saveEdit} size="sm" className="flex-1 gap-1">
                      <Save className="w-3 h-3" />
                      Guardar
                    </Button>
                    <Button onClick={cancelEdit} size="sm" variant="outline">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: node.color }}
                    />
                    <span className="font-mono text-sm text-muted-foreground">{node.id}</span>
                    <span className="font-serif text-foreground">{node.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                      {node.axis}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{node.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground font-mono">
                    <span>x:{node.x} y:{node.y}</span>
                    <span>weight:{node.weight}</span>
                    <span>type:{node.type}</span>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleAiAnalyze(node.id)}
                      disabled={aiLoading === node.id}
                      title="Analizar con IA"
                    >
                      {aiLoading === node.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-primary" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleAiDescribe(node.id)}
                      disabled={aiLoading === node.id}
                      title="Generar descripción IA"
                    >
                      <Brain className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(node)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteNode(node.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
