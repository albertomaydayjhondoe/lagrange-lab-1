import { supabase } from '@/compartido/lib/supabaseClient';

export interface TopologyNode {
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

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  tension: number;
  label: string | null;
  type: string;
}

export interface SocraticQuestion {
  id: string;
  eje: string;
  nivel: number;
  tension: number;
  texto: string;
  corpus_ref: string | null;
}

export interface LagrangeExportData {
  version: string;
  exportedAt: string;
  topology_nodes: TopologyNode[];
  topology_edges: TopologyEdge[];
  socratic_questions: SocraticQuestion[];
}

/**
 * Fetch all data scoped to a specific academy.
 * @param academyId - The academy to scope data to
 */
export async function fetchAllData(academyId: string): Promise<LagrangeExportData> {
  const [nodesRes, edgesRes, questionsRes] = await Promise.all([
    supabase.from('topology_nodes').select('*').eq('academy_id', academyId).order('id'),
    supabase.from('topology_edges').select('*').eq('academy_id', academyId).order('id'),
    supabase.from('socratic_questions').select('*').eq('academy_id', academyId).order('id')
  ]);

  const nodes: TopologyNode[] = (nodesRes.data || []).map(({ id, label, description, x, y, weight, color, axis, type, corpus_refs, question_count }) => ({
    id, label, description, x, y, weight, color, axis, type, corpus_refs, question_count
  }));

  const edges: TopologyEdge[] = (edgesRes.data || []).map(({ id, source, target, tension, label, type }) => ({
    id, source, target, tension, label, type
  }));

  const questions: SocraticQuestion[] = (questionsRes.data || []).map(({ id, eje, nivel, tension, texto, corpus_ref }) => ({
    id, eje, nivel, tension, texto, corpus_ref
  }));

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    topology_nodes: nodes,
    topology_edges: edges,
    socratic_questions: questions
  };
}

export function downloadJSON(data: LagrangeExportData, filename?: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `lagrange-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import data scoped to a specific academy.
 * Deletes existing data for that academy and inserts new data.
 * @param data - The export data to import
 * @param academyId - The academy to scope the import to (REQUIRED)
 */
export async function importData(data: LagrangeExportData, academyId: string): Promise<void> {
  if (!academyId) {
    throw new Error('academyId es requerido para importData');
  }

  // Delete existing data for this academy (questions and edges first due to FK)
  await Promise.all([
    supabase.from('socratic_questions').delete().eq('academy_id', academyId),
    supabase.from('topology_edges').delete().eq('academy_id', academyId),
  ]);
  await supabase.from('topology_nodes').delete().eq('academy_id', academyId);

  // Add academy_id to each record before inserting
  const nodesWithAcademy = data.topology_nodes.map(n => ({ ...n, academy_id: academyId }));
  const edgesWithAcademy = data.topology_edges.map(e => ({ ...e, academy_id: academyId }));
  const questionsWithAcademy = data.socratic_questions.map(q => ({ ...q, academy_id: academyId }));

  // Insert new data
  const { error: nodesError } = await supabase
    .from('topology_nodes')
    .insert(nodesWithAcademy);
  
  if (nodesError) throw nodesError;

  const { error: edgesError } = await supabase
    .from('topology_edges')
    .insert(edgesWithAcademy);
  
  if (edgesError) throw edgesError;

  const { error: questionsError } = await supabase
    .from('socratic_questions')
    .insert(questionsWithAcademy);
  
  if (questionsError) throw questionsError;
}

// Prepare questions for audio generation
export interface AudioConversationItem {
  id: string;
  text: string;
  eje: string;
  nivel: number;
  tension: number;
}

export function prepareQuestionsForAudio(questions: SocraticQuestion[]): AudioConversationItem[] {
  return questions.map(q => ({
    id: q.id,
    text: q.texto,
    eje: q.eje,
    nivel: q.nivel,
    tension: q.tension
  }));
}

export function groupQuestionsByAxis(questions: SocraticQuestion[]): Record<string, SocraticQuestion[]> {
  return questions.reduce((acc, q) => {
    if (!acc[q.eje]) acc[q.eje] = [];
    acc[q.eje].push(q);
    return acc;
  }, {} as Record<string, SocraticQuestion[]>);
}
