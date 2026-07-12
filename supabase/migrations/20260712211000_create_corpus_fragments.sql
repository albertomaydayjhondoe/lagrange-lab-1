-- Migration: Create corpus_fragments table
-- Purpose: Store narrative corpus fragments for AI context injection

-- Create corpus_fragments table
CREATE TABLE IF NOT EXISTS corpus_fragments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file TEXT NOT NULL,
  source_section TEXT,
  axis TEXT[] NOT NULL,
  tension DECIMAL(3,2) NOT NULL CHECK (tension >= 0 AND tension <= 1),
  content TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  weight DECIMAL(3,2) DEFAULT 1.0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for axis-based queries
CREATE INDEX idx_corpus_fragments_axis ON corpus_fragments USING GIN(axis);

-- Create index for keyword-based queries
CREATE INDEX idx_corpus_fragments_keywords ON corpus_fragments USING GIN(keywords);

-- Create index for tension-based queries
CREATE INDEX idx_corpus_fragments_tension ON corpus_fragments(tension DESC);

-- Create RLS policies
ALTER TABLE corpus_fragments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read corpus fragments
CREATE POLICY "Authenticated users can read corpus fragments"
  ON corpus_fragments FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Service role can manage corpus fragments"
  ON corpus_fragments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_corpus_fragments_updated_at
  BEFORE UPDATE ON corpus_fragments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE corpus_fragments IS 'Fragmentos del corpus narrativo para contexto de IA';
COMMENT ON COLUMN corpus_fragments.source_file IS 'Archivo .me de origen';
COMMENT ON COLUMN corpus_fragments.source_section IS 'Sección dentro del archivo';
COMMENT ON COLUMN corpus_fragments.axis IS 'Ejes temáticos (array)';
COMMENT ON COLUMN corpus_fragments.tension IS 'Nivel de tensión 0-1';
COMMENT ON COLUMN corpus_fragments.content IS 'Contenido del fragmento';
COMMENT ON COLUMN corpus_fragments.keywords IS 'Palabras clave para matching';
COMMENT ON COLUMN corpus_fragments.weight IS 'Peso del fragmento para selección';
