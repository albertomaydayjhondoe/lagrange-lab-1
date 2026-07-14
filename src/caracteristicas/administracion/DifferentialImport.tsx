import { useState, useRef } from 'react';
import { Button } from '@/compartido/ui/button';
import { Checkbox } from '@/compartido/ui/checkbox';
import { Label } from '@/compartido/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/compartido/ui/dialog';
import { Upload, Loader2, FileJson, AlertTriangle } from 'lucide-react';
import { supabase } from '@/compartido/lib/supabaseClient';
import { toast } from 'sonner';

interface ImportSelection {
  axes: boolean;
  nodes: boolean;
  edges: boolean;
  questions: boolean;
}

interface ImportData {
  version?: string;
  exportedAt?: string;
  thematic_axes?: any[];
  topology_nodes?: any[];
  topology_edges?: any[];
  socratic_questions?: any[];
}

interface DifferentialImportProps {
  onRefresh: () => void;
  disabled?: boolean;
  academyId: string; // Requerido para scoped operations
}

export function DifferentialImport({ onRefresh, disabled, academyId }: DifferentialImportProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileData, setFileData] = useState<ImportData | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [selection, setSelection] = useState<ImportSelection>({
    axes: false,
    nodes: false,
    edges: false,
    questions: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as ImportData;
      setFileData(data);
      setFileName(file.name);
      
      // Auto-select available entities
      setSelection({
        axes: !!data.thematic_axes?.length,
        nodes: !!data.topology_nodes?.length,
        edges: !!data.topology_edges?.length,
        questions: !!data.socratic_questions?.length,
      });
    } catch (error) {
      toast.error('Error al leer el archivo JSON');
      setFileData(null);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getEntityCounts = () => {
    if (!fileData) return null;
    return {
      axes: fileData.thematic_axes?.length || 0,
      nodes: fileData.topology_nodes?.length || 0,
      edges: fileData.topology_edges?.length || 0,
      questions: fileData.socratic_questions?.length || 0,
    };
  };

  const handleImport = async () => {
    if (!fileData || !academyId) return;

    const counts = getEntityCounts();
    if (!counts) return;

    const selectedItems = [];
    if (selection.axes && counts.axes > 0) selectedItems.push(`${counts.axes} ejes`);
    if (selection.nodes && counts.nodes > 0) selectedItems.push(`${counts.nodes} nodos`);
    if (selection.edges && counts.edges > 0) selectedItems.push(`${counts.edges} tensiones`);
    if (selection.questions && counts.questions > 0) selectedItems.push(`${counts.questions} preguntas`);

    if (selectedItems.length === 0) {
      toast.error('Selecciona al menos una entidad para importar');
      return;
    }

    setLoading(true);

    try {
      // Import axes with upsert (add academy_id)
      if (selection.axes && fileData.thematic_axes?.length) {
        const axesWithAcademy = fileData.thematic_axes.map(a => ({ ...a, academy_id: academyId }));
        const { error } = await supabase
          .from('thematic_axes')
          .upsert(axesWithAcademy, { onConflict: 'id' });
        if (error) throw new Error(`Ejes: ${error.message}`);
      }

      // Import nodes with upsert (add academy_id)
      if (selection.nodes && fileData.topology_nodes?.length) {
        const nodesWithAcademy = fileData.topology_nodes.map(n => ({ ...n, academy_id: academyId }));
        const { error } = await supabase
          .from('topology_nodes')
          .upsert(nodesWithAcademy, { onConflict: 'id' });
        if (error) throw new Error(`Nodos: ${error.message}`);
      }

      // Import edges with upsert (add academy_id)
      if (selection.edges && fileData.topology_edges?.length) {
        const edgesWithAcademy = fileData.topology_edges.map(e => ({ ...e, academy_id: academyId }));
        const { error } = await supabase
          .from('topology_edges')
          .upsert(edgesWithAcademy, { onConflict: 'id' });
        if (error) throw new Error(`Tensiones: ${error.message}`);
      }

      // Import questions with upsert (add academy_id)
      if (selection.questions && fileData.socratic_questions?.length) {
        const questionsWithAcademy = fileData.socratic_questions.map(q => ({ ...q, academy_id: academyId }));
        const { error } = await supabase
          .from('socratic_questions')
          .upsert(questionsWithAcademy, { onConflict: 'id' });
        if (error) throw new Error(`Preguntas: ${error.message}`);
      }

      toast.success(`Importación diferencial completada: ${selectedItems.join(', ')}`);
      setOpen(false);
      setFileData(null);
      setFileName('');
      onRefresh();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const counts = getEntityCounts();
  const hasSelection = Object.values(selection).some(v => v);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="font-mono text-sm gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
        >
          <Upload className="w-4 h-4" />
          Import Diferencial
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <FileJson className="w-5 h-5 text-amber-500" />
            Importación Diferencial
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!fileData ? (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".json"
                className="hidden"
              />
              <FileJson className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Selecciona un archivo JSON para importar
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="font-mono"
              >
                Seleccionar archivo
              </Button>
            </div>
          ) : (
            <>
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-sm font-mono text-muted-foreground">
                  Archivo: <span className="text-foreground">{fileName}</span>
                </p>
                {fileData.exportedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Exportado: {new Date(fileData.exportedAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Selecciona qué importar:</p>
                
                <div className="space-y-2">
                  {counts && counts.axes > 0 && (
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="import-axes"
                        checked={selection.axes}
                        onCheckedChange={(checked) => 
                          setSelection(prev => ({ ...prev, axes: !!checked }))
                        }
                      />
                      <Label htmlFor="import-axes" className="font-mono text-sm cursor-pointer">
                        Ejes temáticos ({counts.axes})
                      </Label>
                    </div>
                  )}
                  
                  {counts && counts.nodes > 0 && (
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="import-nodes"
                        checked={selection.nodes}
                        onCheckedChange={(checked) => 
                          setSelection(prev => ({ ...prev, nodes: !!checked }))
                        }
                      />
                      <Label htmlFor="import-nodes" className="font-mono text-sm cursor-pointer">
                        Nodos ({counts.nodes})
                      </Label>
                    </div>
                  )}
                  
                  {counts && counts.edges > 0 && (
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="import-edges"
                        checked={selection.edges}
                        onCheckedChange={(checked) => 
                          setSelection(prev => ({ ...prev, edges: !!checked }))
                        }
                      />
                      <Label htmlFor="import-edges" className="font-mono text-sm cursor-pointer">
                        Tensiones ({counts.edges})
                      </Label>
                    </div>
                  )}
                  
                  {counts && counts.questions > 0 && (
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="import-questions"
                        checked={selection.questions}
                        onCheckedChange={(checked) => 
                          setSelection(prev => ({ ...prev, questions: !!checked }))
                        }
                      />
                      <Label htmlFor="import-questions" className="font-mono text-sm cursor-pointer">
                        Preguntas ({counts.questions})
                      </Label>
                    </div>
                  )}
                </div>

                {counts && (counts.axes === 0 && counts.nodes === 0 && counts.edges === 0 && counts.questions === 0) && (
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-500/10 rounded-lg p-3">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="text-sm">
                      El archivo no contiene datos reconocidos
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFileData(null);
                    setFileName('');
                  }}
                  className="font-mono"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={loading || !hasSelection}
                  className="font-mono gap-2 bg-amber-600 hover:bg-amber-700"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Importar (Upsert)
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
