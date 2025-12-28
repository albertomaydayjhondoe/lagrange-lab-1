-- Crear tabla de ejes temáticos
CREATE TABLE public.thematic_axes (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  suggested_question_ids TEXT[] DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.thematic_axes ENABLE ROW LEVEL SECURITY;

-- Políticas: lectura pública, escritura admin
CREATE POLICY "Anyone can view axes"
ON public.thematic_axes FOR SELECT
USING (true);

CREATE POLICY "Admin can insert axes"
ON public.thematic_axes FOR INSERT
WITH CHECK (is_admin_user());

CREATE POLICY "Admin can update axes"
ON public.thematic_axes FOR UPDATE
USING (is_admin_user());

CREATE POLICY "Admin can delete axes"
ON public.thematic_axes FOR DELETE
USING (is_admin_user());

-- Trigger para updated_at
CREATE TRIGGER update_thematic_axes_updated_at
BEFORE UPDATE ON public.thematic_axes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data con los ejes actuales
INSERT INTO public.thematic_axes (id, label, description, color, suggested_question_ids, order_index) VALUES
('miedo', 'Miedo', 'El miedo como eje central de control social y autocontrol', '#ef4444', ARRAY['Q01', 'Q02', 'Q15'], 1),
('control', 'Control', 'Mecanismos de control institucional y personal', '#f97316', ARRAY['Q03', 'Q04', 'Q05'], 2),
('salud_mental', 'Salud Mental', 'La medicalización del malestar y la patologización de la disidencia', '#22c55e', ARRAY['Q06', 'Q07', 'Q08'], 3),
('legitimidad', 'Legitimidad', 'Construcción y deconstrucción de la autoridad legítima', '#3b82f6', ARRAY['Q09', 'Q10', 'Q11'], 4),
('responsabilidad', 'Responsabilidad', 'La tensión entre responsabilidad individual y sistémica', '#a855f7', ARRAY['Q12', 'Q13', 'Q14'], 5);