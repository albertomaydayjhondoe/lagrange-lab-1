import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/compartido/lib/supabaseClient';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Edit2, X, FileJson, Upload, Loader2 } from 'lucide-react';
import { fetchAxes, ThematicAxis } from '@/compartido/lib/dataService';

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
  academyId: string; // Requerido para scoped operations
}

export const QuestionEditor = ({ questions, onRefresh, isAdmin, academyId }: QuestionEditorProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<SocraticQuestion>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [filterEje, setFilterEje] = useState<string>('');
  const [axes, setAxes] = useState<ThematicAxis[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [pendingImport, setPendingImport] = useState<SocraticQuestion[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      let questionsToImport: SocraticQuestion[] = [];
      
      if (Array.isArray(data)) {
        questionsToImport = data;
      } else if (data.socratic_questions && Array.isArray(data.socratic_questions)) {
        questionsToImport = data.socratic_questions;
      } else if (data.questions && Array.isArray(data.questions)) {
        questionsToImport = data.questions;
      } else {
        throw new Error('Formato inválido: se esperaba un array o un objeto con "socratic_questions" o "questions"');
      }

      const validQuestions = questionsToImport.filter(q => 
        q.id && q.texto && q.eje
      );

      if (validQuestions.length === 0) {
        throw new Error('No se encontraron preguntas válidas (requieren id, texto y eje)');
      }

      setPendingImport(validQuestions);
      toast.info(`${validQuestions.length} preguntas listas para importar`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al leer el archivo JSON');
      setPendingImport(null);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = async () => {
    if (!pendingImport || pendingImport.length === 0) return;
    if (!academyId) {
      toast.error('Academia no identificada para importar');
      return;
    }

    setImportLoading(true);
    try {
      const questionsWithAcademy = pendingImport.map(q => ({
        ...q,
        academy_id: academyId
      }));
      
      const { error } = await supabase
        .from('socratic_questions')
        .upsert(questionsWithAcademy, { onConflict: 'id' })
        .eq('academy_id', academyId);

      if (error) throw error;

      toast.success(`${pendingImport.length} preguntas importadas con éxito`);
      setPendingImport(null);
      onRefresh();
    } catch (error) {
      toast.error('Error al importar: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setImportLoading(false);
    }
  };

  const cancelImport = () => {
    setPendingImport(null);
  };

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
      .eq('id', editingId)
      .eq('academy_id', academyId);

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
      .eq('id', id)
      .eq('academy_id', academyId);

    if (error) {
      toast.error('Error al eliminar: ' + error.message);
    } else {
      toast.success('Pregunta eliminada');
      onRefresh();
    }
  };

  const createQuestion = async () => {
    if (!academyId) {
      toast.error('No se puede crear pregunta: academia no identificada');
      return;
    }
    if (!newQuestion.id || !newQuestion.texto || !newQuestion.eje) {
      toast.error('ID, Texto y Eje son requeridos');
      return;
    }

    const { error } = await supabase
      .from('socratic_questions')
      .insert([{ ...newQuestion as SocraticQuestion, academy_id: academyId }]);

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
          <div className="flex gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="gap-2"
              size="sm"
              disabled={importLoading}
            >
              <FileJson className="w-4 h-4" />
              Importar JSON
            </Button>
            <Button
              onClick={() => setIsCreating(!isCreating)}
              variant={isCreating ? "outline" : "default"}
              className="gap-2"
              size="sm"
            >
              {isCreating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isCreating ? 'Cancelar' : 'Nueva Pregunta'}
            </Button>
          </div>
        )}
      </div>

      {/* Pending Import Preview */}
      {pendingImport && pendingImport.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-3"
        >
          <div className="flex justify-between items-start">
            <h4 className="font-semibold text-amber-600 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              {pendingImport.length} preguntas pendientes de importar
            </h4>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={confirmImport} 
                disabled={importLoading}
                className="gap-1"
              >
                {importLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Confirmar
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelImport}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {pendingImport.map((q, i) => (
              <div key={i} className="flex items-center gap-2 text-sm p-2 bg-background/50 rounded">
                <span className="font-mono text-xs text-muted-foreground">{q.id}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                  {q.eje}
                </span>
                <span className="truncate flex-1">{q.texto}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

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
          <Input
            placeholder="Texto de la pregunta socrática (máx. 150 caracteres)..."
            value={newQuestion.texto}
            onChange={(e) => setNewQuestion({ ...newQuestion, texto: e.target.value.slice(0, 150) })}
            maxLength={150}
          />
          <p className="text-xs text-muted-foreground text-right">
            {(newQuestion.texto?.length || 0)}/150
          </p>
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
                <div className="space-y-1">
                  <Input
                    value={editData.texto || ''}
                    onChange={(e) => setEditData({ ...editData, texto: e.target.value.slice(0, 150) })}
                    placeholder="Texto de la pregunta (máx. 150 caracteres)"
                    maxLength={150}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {(editData.texto?.length || 0)}/150
                  </p>
                </div>
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
