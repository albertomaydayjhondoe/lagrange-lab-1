import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Edit2, X } from 'lucide-react';

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
  const [newNode, setNewNode] = useState<Partial<TopologyNode>>({
    id: '',
    label: '',
    description: '',
    x: 400,
    y: 300,
    weight: 0.5,
    color: '#3b82f6',
    axis: 'Miedo',
    type: 'core',
    corpus_refs: [],
    question_count: 0
  });

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
      setNewNode({
        id: '',
        label: '',
        description: '',
        x: 400,
        y: 300,
        weight: 0.5,
        color: '#3b82f6',
        axis: 'Miedo',
        type: 'core',
        corpus_refs: [],
        question_count: 0
      });
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
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
            <Input
              placeholder="Axis"
              value={newNode.axis}
              onChange={(e) => setNewNode({ ...newNode, axis: e.target.value })}
            />
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
                  <Input
                    value={editData.axis || ''}
                    onChange={(e) => setEditData({ ...editData, axis: e.target.value })}
                    placeholder="Axis"
                  />
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
