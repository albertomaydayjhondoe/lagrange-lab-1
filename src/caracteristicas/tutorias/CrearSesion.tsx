// Formulario para crear sesiones de tutoría
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Plus, Minus } from 'lucide-react';
import { supabase } from '@/compartido/lib/supabaseClient';
import { useTutorias, getIcon } from './hooks/useTutorias';
import { Subject } from '@/integrations/supabase/types';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { Label } from '@/compartido/ui/label';
import { Textarea } from '@/compartido/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/compartido/ui/select';

export default function CrearSesion() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingSubjects, setFetchingSubjects] = useState(true);
  const [formData, setFormData] = useState({
    subjectId: '',
    title: '',
    description: '',
    date: '',
    time: '',
    durationMinutes: 60,
    priceCents: 0,
    maxStudents: 1,
    meetingLink: '',
  });

  const { fetchSubjects, createSession } = useTutorias();

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    setFetchingSubjects(true);
    const data = await fetchSubjects();
    setSubjects(data);
    setFetchingSubjects(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subjectId || !formData.title || !formData.date || !formData.time) {
      alert('Por favor completa los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      // Combine date and time
      const scheduledAt = new Date(`${formData.date}T${formData.time}`).toISOString();

      const result = await createSession({
        subjectId: formData.subjectId,
        title: formData.title,
        description: formData.description || undefined,
        scheduledAt,
        durationMinutes: formData.durationMinutes,
        priceCents: formData.priceCents,
        maxStudents: formData.maxStudents,
      });

      if (result.success) {
        alert('¡Sesión creada exitosamente!');
        navigate('/tutorias/mis-sesiones');
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Get min date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/tutor/dashboard"
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-serif text-foreground">Crear Sesión</h1>
              <p className="text-sm text-muted-foreground">
                Programa una nueva sesión de tutoría
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Materia *</Label>
            {fetchingSubjects ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cargando materias...</span>
              </div>
            ) : (
              <Select
                value={formData.subjectId}
                onValueChange={(value) => updateField('subjectId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una materia" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <div className="flex items-center gap-2">
                        <span>{getIcon(subject.icon)}</span>
                        <span>{subject.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título de la sesión *</Label>
            <Input
              id="title"
              placeholder="Ej: Introducción al Cálculo Integral"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Describe qué se cubrirá en esta sesión..."
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha *</Label>
              <Input
                id="date"
                type="date"
                min={today}
                value={formData.date}
                onChange={(e) => updateField('date', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => updateField('time', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duración (minutos)</Label>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => updateField('durationMinutes', Math.max(15, formData.durationMinutes - 15))}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-xl font-medium w-20 text-center">
                {formData.durationMinutes} min
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => updateField('durationMinutes', formData.durationMinutes + 15)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label>Precio (USD)</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.priceCents / 100}
                onChange={(e) => updateField('priceCents', Math.round(parseFloat(e.target.value || '0') * 100))}
                className="w-32"
              />
              <span className="text-muted-foreground">
                {formData.priceCents === 0 ? '(Gratis)' : `$${(formData.priceCents / 100).toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* Max Students */}
          <div className="space-y-2">
            <Label>Máximo de estudiantes</Label>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => updateField('maxStudents', Math.max(1, formData.maxStudents - 1))}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-xl font-medium w-20 text-center">
                {formData.maxStudents}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => updateField('maxStudents', Math.min(20, formData.maxStudents + 1))}
              >
                <Plus className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {formData.maxStudents === 1 ? '(Sesión individual)' : '(Sesión grupal)'}
              </span>
            </div>
          </div>

          {/* Meeting Link */}
          <div className="space-y-2">
            <Label htmlFor="meetingLink">Link de reunión (Zoom, Meet, etc.)</Label>
            <Input
              id="meetingLink"
              type="url"
              placeholder="https://zoom.us/j/..."
              value={formData.meetingLink}
              onChange={(e) => updateField('meetingLink', e.target.value)}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/tutor/dashboard')}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Sesión'
              )}
            </Button>
          </div>
        </motion.form>
      </main>
    </div>
  );
}
