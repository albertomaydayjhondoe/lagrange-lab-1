/**
 * Normalizador Multi-Formato - Convierte cualquier formato a texto plano
 * 
 * Flujo según flowchart (INGEST_MULTI):
 * F1 [PDF/DOCX/TXT/MD] ─┐
 * F2 [Audio→transcripción]─┤
 * F3 [Video→subtítulos] ──┼──→ NORMALIZE ──→ Texto Plano ──→ CHUNK ──→ EMBED
 * F4 [URL→scraping] ─────┤
 * F5 [Imagen→OCR] ───────┤
 * F6 [CSV→narrativo] ────┘
 * 
 * Usa parsers.ts para implementaciones reales de:
 * - PDF (extracción nativa + API fallback)
 * - DOCX (parsing XML)
 * - Audio (Whisper API)
 * - Video (YouTube subtitles + transcripción)
 * - Imagen (OCR.space API)
 */

import { 
  parsePDF, 
  parseDOCX, 
  parseAudio, 
  parseVideo, 
  parseImagen,
  getMimeType,
  ParseResult 
} from './parsers.ts';

export interface NormalizedContent {
  text: string;
  source_type: 'pdf' | 'docx' | 'txt' | 'md' | 'audio' | 'video' | 'url' | 'imagen' | 'csv';
  title?: string;
  page_reference?: string;
  original_url?: string;
  metadata?: Record<string, any>;
  warnings?: string[];
}

export interface SourceInput {
  type: 'file' | 'url' | 'text' | 'base64';
  content: string; // URL, texto, o base64 del archivo
  mimeType?: string;
  filename?: string;
}

/**
 * Detecta el tipo de contenido basado en MIME type o filename
 */
export function detectSourceType(input: SourceInput): NormalizedContent['source_type'] {
  const mimeToType: Record<string, NormalizedContent['source_type']> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'docx',
    'text/plain': 'txt',
    'text/markdown': 'md',
    'audio/mpeg': 'audio',
    'audio/wav': 'audio',
    'audio/ogg': 'audio',
    'video/mp4': 'video',
    'video/webm': 'video',
    'video/youtube': 'video',
    'image/png': 'imagen',
    'image/jpeg': 'imagen',
    'image/gif': 'imagen',
    'image/webp': 'imagen',
    'text/csv': 'csv',
    'application/vnd.ms-excel': 'csv',
  };

  // Por filename
  if (input.filename) {
    const ext = input.filename.toLowerCase().split('.').pop();
    const extToType: Record<string, NormalizedContent['source_type']> = {
      'pdf': 'pdf',
      'docx': 'docx',
      'doc': 'docx',
      'txt': 'txt',
      'md': 'md',
      'mp3': 'audio',
      'wav': 'audio',
      'ogg': 'audio',
      'mp4': 'video',
      'webm': 'video',
      'png': 'imagen',
      'jpg': 'imagen',
      'jpeg': 'imagen',
      'gif': 'imagen',
      'webp': 'imagen',
      'csv': 'csv',
      'xlsx': 'csv',
    };
    if (ext && extToType[ext]) return extToType[ext];
  }

  // Por MIME type
  if (input.mimeType && mimeToType[input.mimeType]) {
    return mimeToType[input.mimeType];
  }

  // Por URL
  if (input.type === 'url') {
    return 'url';
  }

  // Default
  return 'txt';
}

/**
 * Normaliza contenido a texto plano
 * Usa parsers.ts para implementaciones reales de todos los formatos
 */
export async function normalizeContent(input: SourceInput): Promise<NormalizedContent> {
  const source_type = detectSourceType(input);
  const warnings: string[] = [];
  
  let result: NormalizedContent;
  
  switch (source_type) {
    case 'pdf':
      result = await normalizePDF(input);
      break;
    case 'docx':
      result = await normalizeDOCX(input);
      break;
    case 'txt':
    case 'md':
      result = await normalizeText(input);
      break;
    case 'audio':
      result = await normalizeAudio(input);
      break;
    case 'video':
      result = await normalizeVideo(input);
      break;
    case 'url':
      result = await normalizeURL(input);
      break;
    case 'imagen':
      result = await normalizeImagen(input);
      break;
    case 'csv':
      result = await normalizeCSV(input);
      break;
    default:
      result = await normalizeText(input);
  }
  
  // Combinar warnings
  if (result.warnings && result.warnings.length > 0) {
    warnings.push(...result.warnings);
  }
  
  // Verificar si el contenido requiere procesamiento adicional
  if (result.text.includes('_PENDIENTE') || result.text.includes('_ERROR')) {
    warnings.push('El contenido requiere procesamiento adicional');
  }
  
  return {
    ...result,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

// ============================================================================
// NORMALIZADORES POR TIPO (usando parsers.ts)
// ============================================================================

/**
 * Normaliza PDF - Extrae texto usando parsers.pdf (extracción nativa + API fallback)
 * F1 del flowchart
 */
async function normalizePDF(input: SourceInput): Promise<NormalizedContent> {
  const result: ParseResult = await parsePDF(input.content, input.filename || 'document.pdf');
  
  return {
    text: result.text,
    source_type: 'pdf',
    title: result.title || input.filename,
    page_reference: result.page_reference,
    original_url: result.original_url,
    metadata: result.metadata,
    warnings: result.warnings
  };
}

/**
 * Normaliza DOCX - Extrae texto usando parsers.docx (parsing XML)
 * F1 del flowchart
 */
async function normalizeDOCX(input: SourceInput): Promise<NormalizedContent> {
  const result: ParseResult = await parseDOCX(input.content, input.filename || 'document.docx');
  
  return {
    text: result.text,
    source_type: 'docx',
    title: result.title || input.filename,
    page_reference: result.page_reference,
    original_url: result.original_url,
    metadata: result.metadata,
    warnings: result.warnings
  };
}

/**
 * Normaliza texto plano o Markdown
 * F1 del flowchart
 */
async function normalizeText(input: SourceInput): Promise<NormalizedContent> {
  let text = '';
  
  if (input.type === 'text') {
    text = input.content;
  } else if (input.type === 'base64') {
    try {
      // Asumiendo que es texto codificado en base64
      const binary = atob(input.content);
      text = decodeURIComponent(escape(binary));
    } catch {
      text = input.content; // Usar como texto plano si falla el decode
    }
  }
  
  // Limpiar caracteres problemáticos
  text = cleanText(text);
  
  // Extraer título del contenido (primera línea o # heading)
  const lines = text.split('\n').filter(l => l.trim());
  let title: string | undefined;
  
  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.substring(2).trim();
      break;
    }
  }
  
  if (!title && lines[0]) {
    title = lines[0].substring(0, 100);
  }
  
  return {
    text,
    source_type: input.mimeType === 'text/markdown' ? 'md' : 'txt',
    title: title || input.filename,
    metadata: {
      char_count: text.length,
      line_count: lines.length
    }
  };
}

/**
 * Normaliza audio - Transcribe usando Whisper API
 * F2 del flowchart
 */
async function normalizeAudio(input: SourceInput): Promise<NormalizedContent> {
  const mimeType = input.mimeType || getMimeType(input.filename || 'audio.mp3');
  const result: ParseResult = await parseAudio(input.content, input.filename || 'audio.mp3', mimeType);
  
  return {
    text: result.text,
    source_type: 'audio',
    title: result.title || input.filename,
    page_reference: result.page_reference,
    original_url: result.original_url,
    metadata: result.metadata,
    warnings: result.warnings
  };
}

/**
 * Normaliza video - Extrae subtítulos/transcript usando parsers.video
 * F3 del flowchart
 */
async function normalizeVideo(input: SourceInput): Promise<NormalizedContent> {
  const isUrl = input.type === 'url';
  const mimeType = input.mimeType || getMimeType(input.filename || 'video.mp4');
  
  const result: ParseResult = await parseVideo(
    input.content,
    input.filename || 'video.mp4',
    { isUrl, mimeType, extractSubtitles: true }
  );
  
  return {
    text: result.text,
    source_type: 'video',
    title: result.title || input.filename,
    page_reference: result.page_reference,
    original_url: result.original_url,
    metadata: result.metadata,
    warnings: result.warnings
  };
}

/**
 * Normaliza URL - Scraping y limpieza HTML
 * F4 del flowchart
 */
async function normalizeURL(input: SourceInput): Promise<NormalizedContent> {
  if (input.type !== 'url') {
    return normalizeText({ type: 'text', content: input.content, filename: 'url.txt' });
  }
  
  // TODO: Implementar scraping real con fetch + cheerio
  // Por ahora, intentar un fetch básico
  try {
    const response = await fetch(input.content, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LagrangeBot/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const text = stripHtml(html);
    
    return {
      text,
      source_type: 'url',
      title: extractTitle(html) || new URL(input.content).hostname,
      original_url: input.content,
      metadata: {
        fetched_at: new Date().toISOString(),
        char_count: text.length
      }
    };
  } catch (error) {
    return {
      text: `[CONTENIDO_URL_ERROR] No se pudo obtener ${input.content}: ${error}`,
      source_type: 'url',
      title: input.content,
      original_url: input.content,
      metadata: {
        error: String(error),
        status: 'fetch_failed'
      }
    };
  }
}

/**
 * Normaliza imagen - Extrae texto usando OCR via parsers.imagen
 * F5 del flowchart
 */
async function normalizeImagen(input: SourceInput): Promise<NormalizedContent> {
  const mimeType = input.mimeType || getMimeType(input.filename || 'image.png');
  const result: ParseResult = await parseImagen(input.content, input.filename || 'image.png', mimeType);
  
  return {
    text: result.text,
    source_type: 'imagen',
    title: result.title || input.filename,
    page_reference: result.page_reference,
    original_url: result.original_url,
    metadata: result.metadata,
    warnings: result.warnings
  };
}

/**
 * Normaliza CSV - Convierte a texto narrativo
 * F6 del flowchart
 */
async function normalizeCSV(input: SourceInput): Promise<NormalizedContent> {
  let text = '';
  
  try {
    if (input.type === 'base64') {
      const binary = atob(input.content);
      text = decodeURIComponent(escape(binary));
    } else {
      text = input.content;
    }
    
    // Parsear CSV básico
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length === 0) {
      return {
        text: '[CONTENIDO_CSV_VACIO]',
        source_type: 'csv',
        title: input.filename || 'datos.csv',
        metadata: { row_count: 0 }
      };
    }
    
    // Detectar delimiter
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : 
                      firstLine.includes(';') ? ';' : ',';
    
    // Parsear headers
    const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
    
    // Convertir a formato narrativo
    const narrative = lines.slice(1).map((line, idx) => {
      const values = line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
      const parts: string[] = [];
      
      for (let i = 0; i < Math.min(headers.length, values.length); i++) {
        if (values[i] && values[i] !== 'null' && values[i] !== '') {
          parts.push(`${headers[i]}: ${values[i]}`);
        }
      }
      
      return `Registro ${idx + 1}: ${parts.join(', ')}.`;
    }).join(' ');
    
    return {
      text: `## Datos tabulares\n\nEste conjunto de datos contiene ${lines.length - 1} registros con los siguientes campos: ${headers.join(', ')}.\n\n### Contenido:\n${narrative}`,
      source_type: 'csv',
      title: input.filename || 'datos.csv',
      metadata: {
        row_count: lines.length - 1,
        column_count: headers.length,
        columns: headers
      }
    };
  } catch (error) {
    return {
      text: `[CONTENIDO_CSV_ERROR] Error procesando CSV: ${error}`,
      source_type: 'csv',
      title: input.filename || 'datos.csv',
      metadata: { error: String(error) }
    };
  }
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Limpia texto de caracteres problemáticos
 */
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[^\S\n]+/g, ' ') // Espacios múltiples
    .replace(/\n{3,}/g, '\n\n') // Líneas múltiples
    .trim();
}

/**
 * Elimina tags HTML y limpia texto
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrae título de HTML
 */
function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : undefined;
}

/**
 * Exportar mapa de tipos soportados para UI
 */
export const SUPPORTED_SOURCE_TYPES = {
  pdf: { 
    icon: '📄', 
    label: 'PDF', 
    description: 'Documento PDF (extracción automática de texto)',
    supported: true,
    requiresApi: false
  },
  docx: { 
    icon: '📝', 
    label: 'DOCX', 
    description: 'Documento Word (extracción de texto)',
    supported: true,
    requiresApi: false
  },
  txt: { 
    icon: '📃', 
    label: 'TXT / MD', 
    description: 'Texto plano o Markdown',
    supported: true,
    requiresApi: false
  },
  audio: { 
    icon: '🎙️', 
    label: 'Audio', 
    description: 'Clases grabadas (requiere WHISPER_API_KEY)',
    supported: true,
    requiresApi: true,
    apiKey: 'WHISPER_API_KEY'
  },
  video: { 
    icon: '🎬', 
    label: 'Video', 
    description: 'YouTube o video local (subtítulos o transcripción)',
    supported: true,
    requiresApi: false
  },
  url: { 
    icon: '🌐', 
    label: 'URL', 
    description: 'Artículo web (scraping automático)',
    supported: true,
    requiresApi: false
  },
  imagen: { 
    icon: '🖼️', 
    label: 'Imagen', 
    description: 'Capturas con texto (OCR básico - sin API key)',
    supported: true,
    requiresApi: false,
    premiumApi: 'OCR_API_KEY'
  },
  csv: { 
    icon: '📊', 
    label: 'CSV / Hoja de cálculo', 
    description: 'Datos tabulares (conversión a texto narrativo)',
    supported: true,
    requiresApi: false
  },
} as const;
