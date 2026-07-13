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

export async function fetchAllData(): Promise<LagrangeExportData> {
  const [nodesRes, edgesRes, questionsRes] = await Promise.all([
    supabase.from('topology_nodes').select('*').order('id'),
    supabase.from('topology_edges').select('*').order('id'),
    supabase.from('socratic_questions').select('*').order('id')
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

export async function importData(data: LagrangeExportData): Promise<void> {
  // Delete existing data (questions and edges first due to FK)
  await Promise.all([
    supabase.from('socratic_questions').delete().neq('id', ''),
    supabase.from('topology_edges').delete().neq('id', ''),
  ]);
  await supabase.from('topology_nodes').delete().neq('id', '');

  // Insert new data
  const { error: nodesError } = await supabase
    .from('topology_nodes')
    .insert(data.topology_nodes);
  
  if (nodesError) throw nodesError;

  const { error: edgesError } = await supabase
    .from('topology_edges')
    .insert(data.topology_edges);
  
  if (edgesError) throw edgesError;

  const { error: questionsError } = await supabase
    .from('socratic_questions')
    .insert(data.socratic_questions);
  
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
