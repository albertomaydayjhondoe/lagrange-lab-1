import { useState } from 'react';
import { supabase } from '@/compartido/lib/supabaseClient';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { Textarea } from '@/compartido/ui/textarea';
import { Switch } from '@/compartido/ui/switch';
import { Label } from '@/compartido/ui/label';
import { Plus, Trash2, Edit2, Save, X, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

export interface ThematicAxis {
  id: string;
  label: string;
  description: string | null;
  color: string;
  suggested_question_ids: string[] | null;
  order_index: number;
  is_active: boolean;
  metadata: unknown;
}

interface AxesEditorProps {
  axes: ThematicAxis[];
  onRefresh: () => void;
  isAdmin: boolean;
}

export const AxesEditor = ({ axes, onRefresh, isAdmin }: AxesEditorProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<ThematicAxis>>({});

  const handleCreate = async () => {
    if (!formData.id || !formData.label || !formData.color) {
      toast.error('ID, Label y Color son requeridos');
      return;
    }

    const insertData = {
      id: formData.id as string,
      label: formData.label as string,
      description: formData.description || null,
      color: formData.color as string,
      suggested_question_ids: (formData.suggested_question_ids || []) as string[],
      order_index: axes.length + 1,
      is_active: formData.is_active ?? true
    };

    const { error } = await supabase.from('thematic_axes').insert([insertData]);

    if (error) {
      toast.error('Error al crear eje: ' + error.message);
      return;
    }

    toast.success('Eje creado');
    setIsCreating(false);
    setFormData({});
    onRefresh();
  };

  const handleUpdate = async (id: string) => {
    const updateData: Record<string, unknown> = {
      label: formData.label,
      description: formData.description,
      color: formData.color,
      suggested_question_ids: formData.suggested_question_ids,
      is_active: formData.is_active
    };
    
    if (formData.metadata !== undefined) {
      updateData.metadata = formData.metadata;
    }

    const { error } = await supabase
      .from('thematic_axes')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast.error('Error al actualizar: ' + error.message);
      return;
    }

    toast.success('Eje actualizado');
    setEditingId(null);
    setFormData({});
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`¿Eliminar eje "${id}"? Esto puede afectar nodos y preguntas asociadas.`)) {
      return;
    }

    const { error } = await supabase.from('thematic_axes').delete().eq('id', id);

    if (error) {
      toast.error('Error al eliminar: ' + error.message);
      return;
    }

    toast.success('Eje eliminado');
    onRefresh();
  };

  const startEdit = (axis: ThematicAxis) => {
    setEditingId(axis.id);
    setFormData(axis);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({});
  };

  const sortedAxes = [...axes].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setIsCreating(true);
              setFormData({ is_active: true, color: '#3b82f6' });
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Eje
          </Button>
        </div>
      )}

      {isCreating && (
        <div className="p-4 border border-primary rounded-lg bg-card space-y-4">
          <h3 className="font-mono text-sm text-primary">Nuevo Eje Temático</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>ID (slug único)</Label>
              <Input
                placeholder="ej: nuevo_eje"
                value={formData.id || ''}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              />
            </div>
            <div>
              <Label>Label</Label>
              <Input
                placeholder="Nombre visible"
                value={formData.label || ''}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              />
            </div>
            <div>
              <Label>Color (hex)</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.color || '#3b82f6'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-12 h-10 p-1"
                />
                <Input
                  placeholder="#3b82f6"
                  value={formData.color || ''}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active ?? true}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Activo</Label>
            </div>
            <div className="md:col-span-2">
              <Label>Descripción</Label>
              <Textarea
                placeholder="Descripción del eje temático..."
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setIsCreating(false); setFormData({}); }}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
            <Button onClick={handleCreate}>
              <Save className="w-4 h-4 mr-1" /> Crear
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sortedAxes.map((axis) => (
          <div
            key={axis.id}
            className="p-4 border border-border rounded-lg bg-card flex items-start gap-4"
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <div
                className="w-6 h-6 rounded-full border-2"
                style={{ backgroundColor: axis.color, borderColor: axis.color }}
              />
            </div>

            {editingId === axis.id ? (
              <div className="flex-1 space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={formData.label || ''}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.color || '#3b82f6'}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={formData.color || ''}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Descripción</Label>
                    <Textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active ?? true}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label className="text-xs">Activo</Label>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={cancelEdit}>
                    <X className="w-3 h-3 mr-1" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={() => handleUpdate(axis.id)}>
                    <Save className="w-3 h-3 mr-1" /> Guardar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{axis.id}</span>
                  <span className="font-serif text-lg">{axis.label}</span>
                  {!axis.is_active && (
                    <span className="text-xs px-2 py-0.5 bg-muted rounded">Inactivo</span>
                  )}
                </div>
                {axis.description && (
                  <p className="text-sm text-muted-foreground mt-1">{axis.description}</p>
                )}
                <div className="flex gap-2 mt-2 text-xs text-muted-foreground font-mono">
                  <span>Orden: {axis.order_index}</span>
                  {axis.suggested_question_ids && axis.suggested_question_ids.length > 0 && (
                    <span>• {axis.suggested_question_ids.length} preguntas sugeridas</span>
                  )}
                </div>
              </div>
            )}

            {isAdmin && editingId !== axis.id && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => startEdit(axis)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(axis.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {axes.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No hay ejes temáticos configurados
        </div>
      )}
    </div>
  );
};
