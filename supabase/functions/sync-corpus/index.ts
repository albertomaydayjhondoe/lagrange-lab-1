import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.run/@supabase/supabase-js@2";
import { getAcademyContext } from "../_shared/academyContext.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CorpusFragmentRow {
  id: string;
  source: string;
  content: string;
  axis: string;
  tension: number;
  keywords: string[];
  created_at?: string;
  updated_at?: string;
  academy_id?: string;
}

async function verifyAuth(req: Request): Promise<{ user: any; supabase: any; isPlatformAdmin: boolean; error?: string }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return { user: null, supabase: null, isPlatformAdmin: false, error: 'Authentication required' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) {
    return { user: null, supabase: null, isPlatformAdmin: false, error: 'Invalid or expired token' };
  }

  // Check if user is platform admin
  const { data: isAdminData } = await supabaseClient.rpc('is_admin_user');
  const isPlatformAdmin = isAdminData === true;

  return { user, supabase: supabaseClient, isPlatformAdmin };
}

interface ParsedCorpusFile {
  file: string;
  title: string;
  axis: string;
  sections: Array<{
    title: string;
    content: string;
    fragments: Array<{
      id: string;
      content: string;
      tension: number;
      axis: string;
      keywords: string[];
    }>;
  }>;
}

const CORPUS_FILES = [
  { name: "critica_socratica_lagrange.me", paths: ["src/data/_legacy/corpus/critica_socratica_lagrange.me", "src/data/corpus/critica_socratica_lagrange.me"] },
  { name: "legitimidad_y_silencio.me", paths: ["src/data/_legacy/corpus/legitimidad_y_silencio.me", "src/data/corpus/legitimidad_y_silencio.me"] },
  { name: "miedo_al_miedo.me", paths: ["src/data/_legacy/corpus/miedo_al_miedo.me", "src/data/corpus/miedo_al_miedo.me"] },
];

function normalizeAxis(axis: string): string {
  const mapping: Record<string, string> = {
    miedo: "Miedo",
    control: "Control",
    saludmental: "SaludMental",
    salud: "SaludMental",
    legitimidad: "Legitimidad",
    responsabilidad: "Responsabilidad",
  };

  const normalized = axis.toLowerCase().trim();
  return mapping[normalized] || axis.trim();
}

function parseCorpusFile(content: string, fileName: string): ParsedCorpusFile {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() || fileName;

  const axisMatch = content.match(/- \*\*Eje Principal\*\*: ([^\n]+)/i);
  const axis = axisMatch ? axisMatch[1].trim() : "Responsabilidad";

  const sections = content
    .split(/^##\s+/m)
    .filter(Boolean)
    .map((section) => {
      const lines = section.split(/\n/);
      const heading = lines[0].trim();
      const body = lines.slice(1).join("\n").trim();
      const fragments = Array.from(body.matchAll(/\*\*Fragmento Clave #\d+:([^\n]+)\*\*/g)).map((match) => {
        const fragmentHeader = match[1].trim();
        const fragmentBlock = body.slice(match.index ?? 0);
        const contentMatch = fragmentBlock.match(/- Contenido:\s*>\s*"?([\s\S]*?)"?\s*$/m);
        const tensionMatch = fragmentBlock.match(/- Tensión:\s*([^\n]+)/m);
        const weightMatch = fragmentBlock.match(/- Peso:\s*([0-9.]+)/m);
        const keywords = Array.from(fragmentBlock.matchAll(/\*\*(.+?)\*\*/g)).map((kw) => kw[1].trim());

        return {
          id: `${fileName}-${fragmentHeader.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          content: contentMatch?.[1]?.trim() || fragmentHeader,
          tension: Number(weightMatch?.[1] || 0.5),
          axis: normalizeAxis(tensionMatch?.[1]?.split(/[↔,]/)[0]?.trim() || axis),
          keywords: keywords.filter(Boolean).slice(0, 8),
        };
      });

      return {
        title: heading,
        content: body,
        fragments,
      };
    })
    .filter((section) => section.fragments.length > 0);

  return {
    file: fileName,
    title,
    axis,
    sections,
  };
}

function buildInlineCorpusText(): string {
  const files = [
    { name: "critica_socratica_lagrange.me", content: `# Crítica Socrática Lagrange\n## El Arte de la Pregunta que Incomoda\n\n> \"La pregunta que incomoda es la única que ilumina.\"\n\n### Metadata\n- **Eje Principal**: Miedo, Control\n- **Tensión**: Alta\n\n## I. Fundamentos de la Fricción Cognitiva\n\n### 1.1 El Método Socrático como Arma\n\nEl método socrático no busca respuestas. Busca grietas. Cada pregunta es un bisturí que corta la piel de las certezas para exponer el tejido de las contradicciones.\n\n**Fragmento Clave #1: Sobre la Pregunta Prohibida**\n- Tensión: Miedo ↔ Legitimidad\n- Peso: 0.85\n- Contenido:\n  > \"¿Por qué asumes que quien tiene el poder de definir la pregunta tiene también la autoridad sobre la respuesta?\"\n\n### 1.2 La Arquitectura del Silencio\n\nEl silencio no es ausencia de sonido. Es presencia de miedo. Cuando una sala entera calla ante una injusticia evidente, no estamos ante cobardía individual sino ante ingeniería social.\n\n**Fragmento Clave #2: Sobre el Costo del Silencio**\n- Tensión: Responsabilidad ↔ Control\n- Peso: 0.92\n- Contenido:\n  > \"El silencio tiene precio. Lo pagan quienes no tienen voz para callarse.\"` },
    { name: "legitimidad_y_silencio.me", content: `# Legitimidad y Silencio\n## Acoso Institucional y los Mecanismos de Silenciamiento\n\n> \"El silencio institucional es violencia estructural.\"\n\n### Metadata\n- **Eje Principal**: Legitimidad, Responsabilidad\n- **Tensión**: Máxima\n\n## I. Anatomía del Silenciamiento\n\n### 1.1 El Silencio como Política Activa\n\nEl silencio no es pasivo. Es una decisión. Cuando una institución calla, está eligiendo activamente qué verdades son admisibles y cuáles deben morir en la oscuridad.\n\n**Fragmento Clave #1: La Economía del Silencio**\n- Tensión: Legitimidad ↔ Responsabilidad\n- Peso: 0.95\n- Contenido:\n  > \"El silencio tiene beneficiarios. Sigue el dinero y encontrarás quién paga para que no se hable.\"` },
    { name: "miedo_al_miedo.me", content: `# Miedo al Miedo\n## Biología del Control y la Arquitectura Hormonal del Poder\n\n> \"El miedo al miedo es el verdadero carcelero.\"\n\n### Metadata\n- **Eje Principal**: Miedo, Salud Mental\n- **Tensión**: Crítica\n\n## I. La Biología como Campo de Batalla\n\n### 1.1 El Cuerpo no Miente (Pero Puede ser Manipulado)\n\nEl miedo no es una emoción. Es una cascada bioquímica que puede ser activada, amplificada y cronificada por diseño. Entender la biología del miedo es el primer paso para desactivar su poder.\n\n**Fragmento Clave #1: La Economía del Cortisol**\n- Tensión: Miedo ↔ Salud Mental\n- Peso: 0.92\n- Contenido:\n  > \"Un pueblo en estrés crónico no tiene energía para cuestionar. El cortisol es el mejor aliado del status quo.\"` },
  ];

  return files.map((file) => `${file.name}\n---\n${file.content}`).join("\n\n");
}

async function resolveCorpusText(filePaths: string[], fileName: string): Promise<string> {
  const repoRoot = Deno.cwd();

  for (const filePath of filePaths) {
    try {
      const absolutePath = `${repoRoot}/${filePath}`;
      return await Deno.readTextFile(absolutePath);
    } catch {
      continue;
    }
  }

  console.warn(`No se pudo leer ${fileName} desde el filesystem; usando contenido inline.`);
  return buildInlineCorpusText();
}

async function upsertCorpusFragments(supabase: any, parsedFiles: ParsedCorpusFile[], academyId: string) {
  const results = [] as Array<{ file: string; inserted: number; updated: number; total: number }>;

  for (const parsedFile of parsedFiles) {
    let fileInserted = 0;
    let fileUpdated = 0;

    for (const section of parsedFile.sections) {
      for (const fragment of section.fragments) {
        const id = `${academyId}-${parsedFile.file}-${fragment.id}`;
        const payload = {
          id,
          source: parsedFile.file,
          content: fragment.content,
          axis: fragment.axis,
          tension: fragment.tension,
          keywords: fragment.keywords,
          academy_id: academyId,
        };

        const { data: existingRows, error: existingError } = await supabase
          .from("corpus_fragments")
          .select("id")
          .eq("id", id)
          .eq("academy_id", academyId)
          .limit(1);

        if (existingError) {
          throw existingError;
        }

        const { error } = await supabase.from("corpus_fragments").upsert(payload, { onConflict: "id" });
        if (error) {
          throw error;
        }

        if ((existingRows || []).length > 0) {
          fileUpdated += 1;
        } else {
          fileInserted += 1;
        }
      }
    }

    results.push({
      file: parsedFile.file,
      inserted: fileInserted,
      updated: fileUpdated,
      total: fileInserted + fileUpdated,
    });
  }

  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const { user, supabase: authSupabase, isPlatformAdmin, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: authError || 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const input = (body || {}) as Record<string, unknown>;
    const dryRun = input.dryRun === true;
    const requestedAcademyId = input.academy_id as string | undefined;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase config missing");
    }

    // Platform admins have full access, otherwise validate academy membership
    let academyId: string;
    if (!isPlatformAdmin) {
      const academyContext = await getAcademyContext(authSupabase, user.id, requestedAcademyId);
      const isAcademyAdmin = academyContext.role === 'owner' || academyContext.role === 'admin';
      if (!isAcademyAdmin) {
        return new Response(
          JSON.stringify({ error: 'Academy admin access required' }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      academyId = academyContext.academyId;
    } else {
      // Platform admin: use requested academy or genesis
      academyId = requestedAcademyId || '00000000-0000-0000-0000-000000000001';
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const parsedFiles = [] as ParsedCorpusFile[];
    for (const file of CORPUS_FILES) {
      const content = await resolveCorpusText(file.paths, file.name);
      parsedFiles.push(parseCorpusFile(content, file.name));
    }

    if (dryRun) {
      const preview = parsedFiles.map((parsedFile) => ({
        file: parsedFile.file,
        fragments: parsedFile.sections.reduce((count, section) => count + section.fragments.length, 0),
      }));

      return new Response(JSON.stringify({ dryRun: true, preview, message: "Preview only; no changes applied.", academyId, platformAdmin: isPlatformAdmin }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = await upsertCorpusFragments(supabase, parsedFiles, academyId);
    const total = results.reduce((sum, item) => sum + item.total, 0);

    console.log(`Sync Corpus - User: ${user.id}, Academy: ${academyId}, PlatformAdmin: ${isPlatformAdmin}, Total: ${total}`);

    return new Response(JSON.stringify({ dryRun: false, synced: true, totalFragments: total, files: results, academyId, platformAdmin: isPlatformAdmin }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("sync-corpus error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
