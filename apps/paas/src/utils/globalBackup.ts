import JSZip from 'jszip';
import { supabase } from '@/compartido/lib/supabaseClient';

export interface GlobalBackupData {
  version: string;
  exportedAt: string;
  metadata: {
    projectName: string;
    description: string;
  };
  database: {
    topology_nodes: any[];
    topology_edges: any[];
    socratic_questions: any[];
    thematic_axes: any[];
    podcast_episodes: any[];
    saved_dialogues: any[];
    profiles: any[];
    user_roles: any[];
    access_requests: any[];
  };
  navigation: {
    routes: { path: string; label: string; description: string }[];
  };
  siteStructure: {
    pages: string[];
    components: string[];
    utils: string[];
    hooks: string[];
    edgeFunctions: string[];
  };
}

export async function createGlobalBackup(): Promise<Blob> {
  const zip = new JSZip();
  
  // Fetch all database data
  const [
    nodesRes, edgesRes, questionsRes, axesRes, 
    episodesRes, dialoguesRes, profilesRes, rolesRes, requestsRes
  ] = await Promise.all([
    supabase.from('topology_nodes').select('*').order('id'),
    supabase.from('topology_edges').select('*').order('id'),
    supabase.from('socratic_questions').select('*').order('id'),
    supabase.from('thematic_axes').select('*').order('order_index'),
    supabase.from('podcast_episodes').select('*').order('created_at', { ascending: false }),
    supabase.from('saved_dialogues').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('*'),
    supabase.from('user_roles').select('*'),
    supabase.from('access_requests').select('*').order('created_at', { ascending: false })
  ]);

  // Main backup manifest
  const manifest: GlobalBackupData = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    metadata: {
      projectName: 'Lagrange',
      description: 'Sistema de diálogo socrático y topología conceptual'
    },
    database: {
      topology_nodes: nodesRes.data || [],
      topology_edges: edgesRes.data || [],
      socratic_questions: questionsRes.data || [],
      thematic_axes: axesRes.data || [],
      podcast_episodes: episodesRes.data || [],
      saved_dialogues: dialoguesRes.data || [],
      profiles: profilesRes.data || [],
      user_roles: rolesRes.data || [],
      access_requests: requestsRes.data || []
    },
    navigation: {
      routes: [
        { path: '/', label: 'Inicio', description: 'Página principal con oráculo socrático' },
        { path: '/map', label: 'Mapa', description: 'Mapa dialéctico de conceptos' },
        { path: '/lab', label: 'Lab', description: 'Laboratorio de prompts' },
        { path: '/podcast', label: 'Podcast', description: 'Episodios de audio' },
        { path: '/profile', label: 'Perfil', description: 'Perfil de usuario' },
        { path: '/admin', label: 'Admin', description: 'Panel de control administrativo' },
        { path: '/auth', label: 'Auth', description: 'Autenticación' }
      ]
    },
    siteStructure: {
      pages: [
        'Index.tsx', 'Map.tsx', 'Lab.tsx', 'Podcast.tsx', 
        'Profile.tsx', 'Admin.tsx', 'Auth.tsx', 'NotFound.tsx'
      ],
      components: [
        'LagrangeNav.tsx', 'LagrangeFooter.tsx', 'LagrangeMap.tsx',
        'FogOverlay.tsx', 'AudioPlayer.tsx', 'SocraticOracle.tsx',
        'SocraticDialogue.tsx', 'NarrativeGenerator.tsx', 'NavLink.tsx',
        'LabPromptEditor.tsx'
      ],
      utils: [
        'aiService.ts', 'aiStructuralService.ts', 'corpusSync.ts',
        'dataService.ts', 'dataExport.ts', 'interactionService.ts',
        'narrativeMatrix.ts', 'globalBackup.ts'
      ],
      hooks: [
        'useAudioPlayer.ts', 'useUserRole.ts', 'use-mobile.tsx', 'use-toast.ts'
      ],
      edgeFunctions: [
        'ai-curate-text', 'ai-dialogue-summary', 'ai-edges', 'ai-episodes',
        'ai-nodes', 'ai-questions', 'elevenlabs-tts', 'generate-narrative',
        'socratic-oracle'
      ]
    }
  };

  // Add manifest to ZIP
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Create database folder with individual files
  const dbFolder = zip.folder('database');
  if (dbFolder) {
    dbFolder.file('topology_nodes.json', JSON.stringify(nodesRes.data || [], null, 2));
    dbFolder.file('topology_edges.json', JSON.stringify(edgesRes.data || [], null, 2));
    dbFolder.file('socratic_questions.json', JSON.stringify(questionsRes.data || [], null, 2));
    dbFolder.file('thematic_axes.json', JSON.stringify(axesRes.data || [], null, 2));
    dbFolder.file('podcast_episodes.json', JSON.stringify(episodesRes.data || [], null, 2));
    dbFolder.file('saved_dialogues.json', JSON.stringify(dialoguesRes.data || [], null, 2));
    dbFolder.file('profiles.json', JSON.stringify(profilesRes.data || [], null, 2));
    dbFolder.file('user_roles.json', JSON.stringify(rolesRes.data || [], null, 2));
    dbFolder.file('access_requests.json', JSON.stringify(requestsRes.data || [], null, 2));
  }

  // Create structure documentation
  const structureDoc = `# Lagrange - Estructura del Proyecto

## Exportado: ${new Date().toISOString()}

## Navegación
${manifest.navigation.routes.map(r => `- **${r.path}** - ${r.label}: ${r.description}`).join('\n')}

## Páginas (src/pages/)
${manifest.siteStructure.pages.map(p => `- ${p}`).join('\n')}

## Componentes Principales (src/components/)
${manifest.siteStructure.components.map(c => `- ${c}`).join('\n')}

## Utilidades (src/utils/)
${manifest.siteStructure.utils.map(u => `- ${u}`).join('\n')}

## Hooks (src/hooks/)
${manifest.siteStructure.hooks.map(h => `- ${h}`).join('\n')}

## Edge Functions (supabase/functions/)
${manifest.siteStructure.edgeFunctions.map(f => `- ${f}/index.ts`).join('\n')}

## Base de Datos

### Tablas
- **topology_nodes**: ${nodesRes.data?.length || 0} registros
- **topology_edges**: ${edgesRes.data?.length || 0} registros
- **socratic_questions**: ${questionsRes.data?.length || 0} registros
- **thematic_axes**: ${axesRes.data?.length || 0} registros
- **podcast_episodes**: ${episodesRes.data?.length || 0} registros
- **saved_dialogues**: ${dialoguesRes.data?.length || 0} registros
- **profiles**: ${profilesRes.data?.length || 0} registros
- **user_roles**: ${rolesRes.data?.length || 0} registros
- **access_requests**: ${requestsRes.data?.length || 0} registros
`;

  zip.file('STRUCTURE.md', structureDoc);

  // Generate statistics
  const stats = {
    generatedAt: new Date().toISOString(),
    totalNodes: nodesRes.data?.length || 0,
    totalEdges: edgesRes.data?.length || 0,
    totalQuestions: questionsRes.data?.length || 0,
    totalAxes: axesRes.data?.length || 0,
    totalEpisodes: episodesRes.data?.length || 0,
    totalDialogues: dialoguesRes.data?.length || 0,
    totalProfiles: profilesRes.data?.length || 0,
    totalUsers: rolesRes.data?.length || 0,
    questionsByAxis: (questionsRes.data || []).reduce((acc: Record<string, number>, q: any) => {
      acc[q.eje] = (acc[q.eje] || 0) + 1;
      return acc;
    }, {}),
    nodesByAxis: (nodesRes.data || []).reduce((acc: Record<string, number>, n: any) => {
      acc[n.axis] = (acc[n.axis] || 0) + 1;
      return acc;
    }, {})
  };

  zip.file('statistics.json', JSON.stringify(stats, null, 2));

  // Generate the ZIP blob
  return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export function downloadZip(blob: Blob, filename?: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `lagrange-backup-${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
