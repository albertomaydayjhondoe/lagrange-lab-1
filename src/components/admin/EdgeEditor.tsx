import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Edit2, X } from 'lucide-react';

interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  tension: number;
  label: string | null;
  type: string;
}

interface EdgeEditorProps {
  edges: TopologyEdge[];
  nodes: { id: string; label: string }[];
  onRefresh: () => void;
  isAdmin: boolean;
}

export const EdgeEditor = ({ edges, nodes, onRefresh, isAdmin }: EdgeEditorProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<TopologyEdge>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newEdge, setNewEdge] = useState<Partial<TopologyEdge>>({
    id: '',
    source: '',
    target: '',
    tension: 0.5,
    label: '',
    type: 'causal'
  });

  const startEdit = (edge: TopologyEdge) => {
    setEditingId(edge.id);
    setEditData(edge);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    
    const { error } = await supabase
      .from('topology_edges')
      .update({
        source: editData.source,
        target: editData.target,
        tension: editData.tension,
        label: editData.label,
        type: editData.type
      })
      .eq('id', editingId);

    if (error) {
      toast.error('Error al guardar: ' + error.message);
    } else {
      toast.success('Tensión actualizada');
      cancelEdit();
      onRefresh();
    }
  };

  const deleteEdge = async (id: string) => {
    if (!confirm('¿Eliminar esta tensión?')) return;
    
    const { error } = await supabase
      .from('topology_edges')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error al eliminar: ' + error.message);
    } else {
      toast.success('Tensión eliminada');
      onRefresh();
    }
  };

  const createEdge = async () => {
    if (!newEdge.id || !newEdge.source || !newEdge.target) {
      toast.error('ID, Source y Target son requeridos');
      return;
    }

    const { error } = await supabase
      .from('topology_edges')
      .insert([newEdge as TopologyEdge]);

    if (error) {
      toast.error('Error al crear: ' + error.message);
    } else {
      toast.success('Tensión creada');
      setIsCreating(false);
      setNewEdge({
        id: '',
        source: '',
        target: '',
        tension: 0.5,
        label: '',
        type: 'causal'
      });
      onRefresh();
    }
  };

  const getNodeLabel = (id: string) => {
    return nodes.find(n => n.id === id)?.label || id;
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
            {isCreating ? 'Cancelar' : 'Nueva Tensión'}
          </Button>
        </div>
      )}

      {isCreating && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-secondary/50 rounded-lg p-4 space-y-3"
        >
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Input
              placeholder="ID único"
              value={newEdge.id}
              onChange={(e) => setNewEdge({ ...newEdge, id: e.target.value })}
            />
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newEdge.source}
              onChange={(e) => setNewEdge({ ...newEdge, source: e.target.value })}
            >
              <option value="">Source...</option>
              {nodes.map(n => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newEdge.target}
              onChange={(e) => setNewEdge({ ...newEdge, target: e.target.value })}
            >
              <option value="">Target...</option>
              {nodes.map(n => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>
            <Input
              type="number"
              step="0.01"
              placeholder="Tensión (0-1)"
              value={newEdge.tension}
              onChange={(e) => setNewEdge({ ...newEdge, tension: parseFloat(e.target.value) })}
            />
            <Input
              placeholder="Tipo"
              value={newEdge.type}
              onChange={(e) => setNewEdge({ ...newEdge, type: e.target.value })}
            />
          </div>
          <Input
            placeholder="Label descriptivo"
            value={newEdge.label || ''}
            onChange={(e) => setNewEdge({ ...newEdge, label: e.target.value })}
          />
          <Button onClick={createEdge} className="gap-2">
            <Save className="w-4 h-4" />
            Crear
          </Button>
        </motion.div>
      )}

      <div className="space-y-2">
        {edges.map((edge) => (
          <motion.div
            key={edge.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card border border-border rounded-lg p-4"
          >
            {editingId === edge.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editData.source}
                    onChange={(e) => setEditData({ ...editData, source: e.target.value })}
                  >
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.label}</option>
                    ))}
                  </select>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editData.target}
                    onChange={(e) => setEditData({ ...editData, target: e.target.value })}
                  >
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.label}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    step="0.01"
                    value={editData.tension}
                    onChange={(e) => setEditData({ ...editData, tension: parseFloat(e.target.value) })}
                    placeholder="Tensión"
                  />
                  <Input
                    value={editData.type || ''}
                    onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                    placeholder="Tipo"
                  />
                </div>
                <Input
                  value={editData.label || ''}
                  onChange={(e) => setEditData({ ...editData, label: e.target.value })}
                  placeholder="Label"
                />
                <div className="flex gap-2">
                  <Button onClick={saveEdit} size="sm" className="gap-1">
                    <Save className="w-3 h-3" />
                    Guardar
                  </Button>
                  <Button onClick={cancelEdit} size="sm" variant="outline">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-sm text-muted-foreground">{edge.id}</span>
                    <span className="font-serif text-foreground">
                      {getNodeLabel(edge.source)} → {getNodeLabel(edge.target)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                      {edge.type}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-lagrange-tension/20 text-lagrange-tension font-mono">
                      {edge.tension.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{edge.label}</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(edge)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteEdge(edge.id)}
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
