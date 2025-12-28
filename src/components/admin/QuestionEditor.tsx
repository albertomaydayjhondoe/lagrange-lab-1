import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Edit2, X } from 'lucide-react';
import { fetchAxes, ThematicAxis } from '@/utils/dataService';

interface SocraticQuestion {
  id: string;
  eje: string;
  nivel: number;
  tension: number;
  texto: string;
  corpus_ref: string | null;
}

interface QuestionEditorProps {
  questions: SocraticQuestion[];
  onRefresh: () => void;
  isAdmin: boolean;
}

export const QuestionEditor = ({ questions, onRefresh, isAdmin }: QuestionEditorProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<SocraticQuestion>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [filterEje, setFilterEje] = useState<string>('');
  const [axes, setAxes] = useState<ThematicAxis[]>([]);
  const [newQuestion, setNewQuestion] = useState<Partial<SocraticQuestion>>({
    id: '',
    eje: '',
    nivel: 1,
    tension: 0.8,
    texto: '',
    corpus_ref: ''
  });

  useEffect(() => {
    fetchAxes().then(data => {
      setAxes(data);
      if (data.length > 0 && !newQuestion.eje) {
        setNewQuestion(prev => ({ ...prev, eje: data[0].id }));
      }
    });
  }, []);

  const filteredQuestions = filterEje 
    ? questions.filter(q => q.eje === filterEje)
    : questions;

  const startEdit = (question: SocraticQuestion) => {
    setEditingId(question.id);
    setEditData(question);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    
    const { error } = await supabase
      .from('socratic_questions')
      .update({
        eje: editData.eje,
        nivel: editData.nivel,
        tension: editData.tension,
        texto: editData.texto,
        corpus_ref: editData.corpus_ref
      })
      .eq('id', editingId);

    if (error) {
      toast.error('Error al guardar: ' + error.message);
    } else {
      toast.success('Pregunta actualizada');
      cancelEdit();
      onRefresh();
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('¿Eliminar esta pregunta?')) return;
    
    const { error } = await supabase
      .from('socratic_questions')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error al eliminar: ' + error.message);
    } else {
      toast.success('Pregunta eliminada');
      onRefresh();
    }
  };

  const createQuestion = async () => {
    if (!newQuestion.id || !newQuestion.texto || !newQuestion.eje) {
      toast.error('ID, Texto y Eje son requeridos');
      return;
    }

    const { error } = await supabase
      .from('socratic_questions')
      .insert([newQuestion as SocraticQuestion]);

    if (error) {
      toast.error('Error al crear: ' + error.message);
    } else {
      toast.success('Pregunta creada');
      setIsCreating(false);
      const defaultAxis = axes[0];
      setNewQuestion({
        id: '',
        eje: defaultAxis?.id || '',
        nivel: 1,
        tension: 0.8,
        texto: '',
        corpus_ref: ''
      });
      onRefresh();
    }
  };

  const getEjeColor = (eje: string) => {
    const axis = axes.find(a => a.id === eje);
    if (axis?.color) {
      return `bg-[${axis.color}]/20 text-[${axis.color}]`;
    }
    return 'bg-secondary text-muted-foreground';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={filterEje === '' ? 'default' : 'outline'}
            onClick={() => setFilterEje('')}
          >
            Todos ({questions.length})
          </Button>
          {axes.map(axis => (
            <Button
              key={axis.id}
              size="sm"
              variant={filterEje === axis.id ? 'default' : 'outline'}
              onClick={() => setFilterEje(axis.id)}
              style={{ borderColor: axis.color }}
            >
              {axis.label} ({questions.filter(q => q.eje === axis.id).length})
            </Button>
          ))}
        </div>
        {isAdmin && (
          <Button
            onClick={() => setIsCreating(!isCreating)}
            variant={isCreating ? "outline" : "default"}
            className="gap-2"
          >
            {isCreating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isCreating ? 'Cancelar' : 'Nueva Pregunta'}
          </Button>
        )}
      </div>

      {isCreating && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-secondary/50 rounded-lg p-4 space-y-3"
        >
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Input
              placeholder="ID único (Q36, Q37...)"
              value={newQuestion.id}
              onChange={(e) => setNewQuestion({ ...newQuestion, id: e.target.value })}
            />
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newQuestion.eje}
              onChange={(e) => setNewQuestion({ ...newQuestion, eje: e.target.value })}
            >
              {axes.map(axis => (
                <option key={axis.id} value={axis.id}>{axis.label}</option>
              ))}
            </select>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newQuestion.nivel}
              onChange={(e) => setNewQuestion({ ...newQuestion, nivel: parseInt(e.target.value) })}
            >
              <option value={1}>Nivel 1</option>
              <option value={2}>Nivel 2</option>
              <option value={3}>Nivel 3</option>
            </select>
            <Input
              type="number"
              step="0.01"
              placeholder="Tensión (0-1)"
              value={newQuestion.tension}
              onChange={(e) => setNewQuestion({ ...newQuestion, tension: parseFloat(e.target.value) })}
            />
            <Input
              placeholder="Corpus ref"
              value={newQuestion.corpus_ref || ''}
              onChange={(e) => setNewQuestion({ ...newQuestion, corpus_ref: e.target.value })}
            />
          </div>
          <Textarea
            placeholder="Texto de la pregunta socrática..."
            value={newQuestion.texto}
            onChange={(e) => setNewQuestion({ ...newQuestion, texto: e.target.value })}
            rows={2}
          />
          <Button onClick={createQuestion} className="gap-2">
            <Save className="w-4 h-4" />
            Crear
          </Button>
        </motion.div>
      )}

      <div className="space-y-2">
        {filteredQuestions.map((question) => (
          <motion.div
            key={question.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card border border-border rounded-lg p-4"
          >
            {editingId === question.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editData.eje}
                    onChange={(e) => setEditData({ ...editData, eje: e.target.value })}
                  >
                    {axes.map(axis => (
                      <option key={axis.id} value={axis.id}>{axis.label}</option>
                    ))}
                  </select>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editData.nivel}
                    onChange={(e) => setEditData({ ...editData, nivel: parseInt(e.target.value) })}
                  >
                    <option value={1}>Nivel 1</option>
                    <option value={2}>Nivel 2</option>
                    <option value={3}>Nivel 3</option>
                  </select>
                  <Input
                    type="number"
                    step="0.01"
                    value={editData.tension}
                    onChange={(e) => setEditData({ ...editData, tension: parseFloat(e.target.value) })}
                    placeholder="Tensión"
                  />
                  <Input
                    value={editData.corpus_ref || ''}
                    onChange={(e) => setEditData({ ...editData, corpus_ref: e.target.value })}
                    placeholder="Corpus ref"
                  />
                </div>
                <Textarea
                  value={editData.texto || ''}
                  onChange={(e) => setEditData({ ...editData, texto: e.target.value })}
                  placeholder="Texto"
                  rows={2}
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
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-mono text-sm text-muted-foreground">{question.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${getEjeColor(question.eje)}`}>
                      {question.eje}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                      Nivel {question.nivel}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-lagrange-tension/20 text-lagrange-tension font-mono">
                      {question.tension.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-foreground font-serif">{question.texto}</p>
                  {question.corpus_ref && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      ref: {question.corpus_ref}
                    </p>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(question)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteQuestion(question.id)}
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
