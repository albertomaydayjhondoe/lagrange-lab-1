/**
 * Spaces Editor - Editor de Espacios Académicos (academy_spaces)
 * Reemplaza a AxesEditor.tsx para gestionar espacios unificados
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/compartido/lib/supabaseClient';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { Textarea } from '@/compartido/ui/textarea';
import { Switch } from '@/compartido/ui/switch';
import { Label } from '@/compartido/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/compartido/ui/select';
import { Plus, Trash2, Edit2, Save, X, GripVertical, ChevronRight, Folder } from 'lucide-react';
import { toast } from 'sonner';
import type { AcademySpace } from '@/compartido/lib/academySpacesService';

interface SpacesEditorProps {
  onRefresh?: () => void;
  isAdmin: boolean;
  academyId: string;
}

export const SpacesEditor = ({ onRefresh, isAdmin, academyId }: SpacesEditorProps) => {
  const [spaces, setSpaces] = useState<AcademySpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<AcademySpace>>({});
  const [parentSpaceId, setParentSpaceId] = useState<string | null>(null);
  const [showChildren, setShowChildren] = useState<Record<string, boolean>>({});

  // Cargar espacios
  const fetchSpaces = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('academy_spaces')
      .select('*')
      .eq('academy_id', academyId)
      .eq('is_active', true)
      .order('order_index');

    if (error) {
      console.error('Error fetching spaces:', error);
      toast.error('Error al cargar espacios');
    } else {
      setSpaces(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSpaces();
  }, [academyId]);

  // Espacios raíz (sin padre)
  const rootSpaces = spaces.filter(s => !s.parent_space_id);
  
  // Espacios hijos de un padre
  const getChildSpaces = (parentId: string) => spaces.filter(s => s.parent_space_id === parentId);

  // Manejar creación
  const handleCreate = async () => {
    if (!formData.name || !formData.slug) {
      toast.error('Nombre y Slug son requeridos');
      return;
    }

    // Generar slug si no existe
    const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const insertData = {
      academy_id: academyId,
      name: formData.name,
      slug,
      description: formData.description || null,
      icon: formData.icon || 'Folder',
      color: formData.color || '#8B5CF6',
      parent_space_id: parentSpaceId || null,
      order_index: spaces.filter(s => s.parent_space_id === parentSpaceId).length,
      is_active: true,
    };

    const { error } = await supabase.from('academy_spaces').insert([insertData]);

    if (error) {
      toast.error('Error al crear espacio: ' + error.message);
      return;
    }

    toast.success('Espacio creado');
    setIsCreating(false);
    setParentSpaceId(null);
    setFormData({});
    fetchSpaces();
    onRefresh?.();
  };

  // Manejar actualización
  const handleUpdate = async (id: string) => {
    const updateData: Record<string, unknown> = {
      name: formData.name,
      description: formData.description,
      icon: formData.icon,
      color: formData.color,
      is_active: formData.is_active,
    };

    const { error } = await supabase
      .from('academy_spaces')
      .update(updateData)
      .eq('id', id)
      .eq('academy_id', academyId);

    if (error) {
      toast.error('Error al actualizar: ' + error.message);
      return;
    }

    toast.success('Espacio actualizado');
    setEditingId(null);
    setFormData({});
    fetchSpaces();
    onRefresh?.();
  };

  // Manejar eliminación
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar espacio "${name}" y todos sus sub-espacios?`)) {
      return;
    }

    const { error } = await supabase
      .from('academy_spaces')
      .delete()
      .eq('id', id)
      .eq('academy_id', academyId);

    if (error) {
      toast.error('Error al eliminar: ' + error.message);
      return;
    }

    toast.success('Espacio eliminado');
    fetchSpaces();
    onRefresh?.();
  };

  // Iniciar edición
  const startEdit = (space: AcademySpace) => {
    setEditingId(space.id);
    setFormData(space);
  };

  // Cancelar edición
  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setParentSpaceId(null);
    setFormData({});
  };

  // Toggle hijos
  const toggleChildren = (parentId: string) => {
    setShowChildren(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  // Colores predefinidos
  const colorPresets = [
    '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', 
    '#EF4444', '#EC4899', '#6366F1', '#14B8A6'
  ];

  // Iconos disponibles
  const iconOptions = [
    { value: 'Folder', label: 'Carpeta' },
    { value: 'BookOpen', label: 'Libro' },
    { value: 'Target', label: 'Objetivo' },
    { value: 'Atom', label: 'Átomo' },
    { value: 'Calculator', label: 'Matemáticas' },
    { value: 'Code', label: 'Código' },
    { value: 'Palette', label: 'Arte' },
    { value: 'Scale', label: 'Ética' },
    { value: 'History', label: 'Historia' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => {
              setIsCreating(true);
              setParentSpaceId(null);
              setFormData({ is_active: true, color: '#8B5CF6', icon: 'Folder' });
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Espacio Raíz
          </Button>
          {rootSpaces.length > 0 && (
            <Select onValueChange={(v) => {
              setIsCreating(true);
              setParentSpaceId(v);
              setFormData({ is_active: true, color: '#8B5CF6', icon: 'Folder' });
            }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Añadir sub-espacio..." />
              </SelectTrigger>
              <SelectContent>
                {rootSpaces.map(space => (
                  <SelectItem key={space.id} value={space.id}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Formulario de creación */}
      {isCreating && (
        <div className="p-4 border border-primary rounded-lg bg-card space-y-4">
          <h3 className="font-mono text-sm text-primary">
            {parentSpaceId ? `Nuevo Sub-espacio de ${spaces.find(s => s.id === parentSpaceId)?.name}` : 'Nuevo Espacio Raíz'}
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Nombre *</Label>
              <Input
                placeholder="Nombre del espacio"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input
                placeholder="nombre-para-url"
                value={formData.slug || ''}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={formData.color || '#8B5CF6'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-12 h-10 p-1"
                />
                <div className="flex gap-1">
                  {colorPresets.map(color => (
                    <button
                      key={color}
                      className="w-6 h-6 rounded-full border-2"
                      style={{ backgroundColor: color, borderColor: color === formData.color ? 'white' : 'transparent' }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label>Icono</Label>
              <Select value={formData.icon || 'Folder'} onValueChange={(v) => setFormData({ ...formData, icon: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Descripción</Label>
              <Textarea
                placeholder="Descripción del espacio..."
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={cancelEdit}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
            <Button onClick={handleCreate}>
              <Save className="w-4 h-4 mr-1" /> Crear
            </Button>
          </div>
        </div>
      )}

      {/* Lista de espacios */}
      <div className="space-y-2">
        {rootSpaces.map((space) => {
          const children = getChildSpaces(space.id);
          const isExpanded = showChildren[space.id];

          return (
            <div key={space.id} className="space-y-1">
              {/* Espacio principal */}
              <div
                className="p-3 border border-border rounded-lg bg-card flex items-center gap-3"
                style={{ borderLeftColor: space.color, borderLeftWidth: 4 }}
              >
                {children.length > 0 && (
                  <button
                    onClick={() => toggleChildren(space.id)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>
                )}
                {children.length === 0 && <div className="w-6" />}

                <Folder className="w-5 h-5" style={{ color: space.color }} />
                
                {editingId === space.id ? (
                  <div className="flex-1 space-y-2">
                    <div className="grid md:grid-cols-3 gap-2">
                      <Input
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Nombre"
                      />
                      <Input
                        type="color"
                        value={formData.color || '#8B5CF6'}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-12 h-10 p-1"
                      />
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.is_active ?? true}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <Label className="text-xs">Activo</Label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdate(space.id)}>
                        <Save className="w-3 h-3 mr-1" /> Guardar
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        <X className="w-3 h-3 mr-1" /> Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <span className="font-serif">{space.name}</span>
                      {space.description && (
                        <p className="text-xs text-muted-foreground">{space.description}</p>
                      )}
                      {space.source_table && (
                        <span className="text-xs text-muted-foreground font-mono ml-2">
                          ({space.source_table})
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {isAdmin && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => startEdit(space)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(space.id, space.name)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Sub-espacios */}
              {children.length > 0 && isExpanded && (
                <div className="ml-8 space-y-1 border-l-2 border-muted pl-4">
                  {children.map(child => (
                    <div
                      key={child.id}
                      className="p-2 border border-border rounded bg-muted/50 flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: child.color }}
                      />
                      <span className="text-sm">{child.name}</span>
                      <span className="text-xs text-muted-foreground font-mono ml-2">
                        {child.slug}
                      </span>
                      {isAdmin && (
                        <div className="flex gap-1 ml-auto">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(child)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(child.id, child.name)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {rootSpaces.length === 0 && !isCreating && (
        <div className="text-center py-8 text-muted-foreground">
          <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No hay espacios configurados</p>
          {isAdmin && (
            <p className="text-sm mt-1">Crea tu primer espacio para organizar el contenido</p>
          )}
        </div>
      )}
    </div>
  );
};
