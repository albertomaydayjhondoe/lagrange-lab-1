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
 */

export interface NormalizedContent {
  text: string;
  source_type: 'pdf' | 'docx' | 'txt' | 'md' | 'audio' | 'video' | 'url' | 'imagen' | 'csv';
  title?: string;
  page_reference?: string;
  original_url?: string;
  metadata?: Record<string, any>;
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
 * Este es el paso NORMALIZE del flowchart - TODO: implementar parsers reales
 */
export async function normalizeContent(input: SourceInput): Promise<NormalizedContent> {
  const source_type = detectSourceType(input);
  
  switch (source_type) {
    case 'pdf':
      return normalizePDF(input);
    case 'docx':
      return normalizeDOCX(input);
    case 'txt':
    case 'md':
      return normalizeText(input);
    case 'audio':
      return normalizeAudio(input);
    case 'video':
      return normalizeVideo(input);
    case 'url':
      return normalizeURL(input);
    case 'imagen':
      return normalizeImagen(input);
    case 'csv':
      return normalizeCSV(input);
    default:
      return normalizeText(input);
  }
}

// ============================================================================
// NORMALIZADORES POR TIPO
// ============================================================================

/**
 * Normaliza PDF - Extrae texto (requiere pdf-parse en entorno real)
 * F1 del flowchart
 */
async function normalizePDF(input: SourceInput): Promise<NormalizedContent> {
  // TODO: Implementar con pdf-parse o similar
  // Por ahora, marcar como pendiente de parsing real
  return {
    text: `[CONTENIDO_PDF_PENDIENTE] El archivo PDF requiere parsing con pdf-parse o similar`,
    source_type: 'pdf',
    title: input.filename || 'documento.pdf',
    metadata: {
      parser: 'pdf-parse',
      status: 'pending_implementation',
      note: 'Requiere integración con servicio de parsing PDF'
    }
  };
}

/**
 * Normaliza DOCX - Extrae texto (requiere mammoth en entorno real)
 * F1 del flowchart
 */
async function normalizeDOCX(input: SourceInput): Promise<NormalizedContent> {
  // TODO: Implementar con mammoth o similar
  return {
    text: `[CONTENIDO_DOCX_PENDIENTE] El archivo DOCX requiere parsing con mammoth o similar`,
    source_type: 'docx',
    title: input.filename || 'documento.docx',
    metadata: {
      parser: 'mammoth',
      status: 'pending_implementation'
    }
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
 * Normaliza audio - Requiere transcripción previa
 * F2 del flowchart
 */
async function normalizeAudio(input: SourceInput): Promise<NormalizedContent> {
  // TODO: Implementar con servicio de transcripción (Whisper, etc.)
  return {
    text: `[CONTENIDO_AUDIO_PENDIENTE] El audio requiere transcripción con Whisper API o similar`,
    source_type: 'audio',
    title: input.filename || 'audio.mp3',
    metadata: {
      parser: 'whisper-api',
      status: 'pending_implementation',
      note: 'Primero transcribir, luego enviar texto transcrito'
    }
  };
}

/**
 * Normaliza video - Extrae subtítulos/transcript
 * F3 del flowchart
 */
async function normalizeVideo(input: SourceInput): Promise<NormalizedContent> {
  // Detectar si es YouTube
  const isYouTube = input.content.includes('youtube.com') || input.content.includes('youtu.be');
  
  if (isYouTube) {
    return {
      text: `[CONTENIDO_YOUTUBE_PENDIENTE] YouTube: ${input.content} - Requiere extracción de subtítulos`,
      source_type: 'video',
      title: `Video de YouTube`,
      original_url: input.content,
      metadata: {
        platform: 'youtube',
        parser: 'youtube-transcript-api',
        status: 'pending_implementation'
      }
    };
  }
  
  // Video local
  return {
    text: `[CONTENIDO_VIDEO_PENDIENTE] El video local requiere extracción de subtítulos o transcripción`,
    source_type: 'video',
    title: input.filename || 'video.mp4',
    metadata: {
      parser: 'whisper-api',
      status: 'pending_implementation'
    }
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
 * Normaliza imagen - OCR si contiene texto
 * F5 del flowchart
 */
async function normalizeImagen(input: SourceInput): Promise<NormalizedContent> {
  // TODO: Implementar OCR con Tesseract.js o similar
  return {
    text: `[CONTENIDO_IMAGEN_PENDIENTE] La imagen requiere OCR con Tesseract.js o similar`,
    source_type: 'imagen',
    title: input.filename || 'imagen.png',
    metadata: {
      parser: 'tesseract-ocr',
      status: 'pending_implementation',
      note: 'Primero OCR, luego enviar texto extraído'
    }
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
  pdf: { icon: '📄', label: 'PDF / DOCX / TXT / MD', description: 'Documentos de texto' },
  audio: { icon: '🎙️', label: 'Audio', description: 'Clases grabadas (requiere transcripción)' },
  video: { icon: '🎬', label: 'Video', description: 'YouTube o video local (requiere subtítulos)' },
  url: { icon: '🌐', label: 'URL', description: 'Artículo web (scraping automático)' },
  imagen: { icon: '🖼️', label: 'Imagen', description: 'Capturas con texto (requiere OCR)' },
  csv: { icon: '📊', label: 'CSV / Hoja de cálculo', description: 'Datos tabulares (conversión a texto)' },
} as const;
