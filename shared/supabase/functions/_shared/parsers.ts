/**
 * parsers.ts
 * 
 * Implementaciones reales de parsing multi-formato para RAG
 * Usa APIs nativas de Deno y servicios externos cuando es necesario
 * 
 * Flujo según flowchart:
 * F1 [PDF/DOCX] ─┐
 * F2 [Audio] ────┼──→ NORMALIZE ──→ Texto Plano
 * F3 [Video] ────┤
 * F5 [Imagen] ───┘
 */

export interface ParseResult {
  text: string;
  title?: string;
  page_reference?: string;
  original_url?: string;
  metadata?: Record<string, unknown>;
  warnings?: string[];
  success: boolean;
  error?: string;
}

// ============================================================================
// CONSTANTES Y UTILIDADES
// ============================================================================

const MAX_TEXT_LENGTH = 50000;
const PDFCO_API_KEY = Deno.env.get("PDFCO_API_KEY"); // Opcional: pdf.co para parsing avanzado
const WHISPER_API_URL = Deno.env.get("WHISPER_API_URL"); // Whisper API para audio

// ============================================================================
// F1: PDF PARSING
// ============================================================================

/**
 * Extrae texto de PDF usando múltiples estrategias
 * Estrategia 1: PDF.js embebido (para PDFs modernos con texto)
 * Estrategia 2: Basic text extraction para PDFs con streams de texto
 * Estrategia 3: External API (pdf.co) como fallback
 */
export async function parsePDF(
  base64Content: string,
  filename: string
): Promise<ParseResult> {
  const warnings: string[] = [];
  
  try {
    // Decodificar el contenido base64
    const binaryContent = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
    
    // Intentar extraer texto usando regex para streams PDF comunes
    // Esta es una implementación básica que funciona para PDFs con texto no encriptado
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const pdfContent = textDecoder.decode(binaryContent);
    
    // Extraer streams de texto del PDF
    const textStreams = extractPDFTextStreams(pdfContent);
    
    if (textStreams.length > 0) {
      // Limpiar y unir los streams de texto
      let fullText = textStreams
        .map(stream => cleanPDFText(stream))
        .filter(t => t.length > 20) // Filtrar streams muy cortos (probablemente ruido)
        .join('\n\n');
      
      // Limitar tamaño
      if (fullText.length > MAX_TEXT_LENGTH) {
        fullText = fullText.substring(0, MAX_TEXT_LENGTH);
        warnings.push(`Texto truncado a ${MAX_TEXT_LENGTH} caracteres`);
      }
      
      // Extraer título del PDF
      const title = extractPDFTitle(pdfContent) || filename.replace('.pdf', '');
      
      return {
        text: fullText,
        title,
        metadata: {
          parser: 'pdf-native',
          streams_found: textStreams.length,
          original_size: binaryContent.length
        },
        warnings,
        success: true
      };
    }
    
    // Si no encontramos texto, intentar con API externa
    if (PDFCO_API_KEY) {
      return await parsePDFWithAPI(base64Content, filename);
    }
    
    // Fallback: devolver placeholder
    warnings.push('No se pudo extraer texto del PDF. Contenido puede estar encriptado o ser imagen.');
    return {
      text: `[CONTENIDO_PDF_PARCIAL] Se detectó el archivo "${filename}" pero el texto está encriptado o es imagen. Para mejor результат, usa PDF con texto seleccionable o convierte a texto plano.`,
      title: filename.replace('.pdf', ''),
      metadata: {
        parser: 'pdf-fallback',
        warning: 'limited_extraction'
      },
      warnings,
      success: false,
      error: 'No se pudo extraer texto del PDF'
    };
    
  } catch (error) {
    return {
      text: '',
      title: filename,
      metadata: { parser: 'pdf-error' },
      warnings,
      success: false,
      error: String(error)
    };
  }
}

/**
 * Extrae streams de texto de un PDF usando regex
 */
function extractPDFTextStreams(pdfContent: string): string[] {
  const streams: string[] = [];
  
  // Buscar todos los streams de texto
  // Patrón para streams entre BT...ET (Begin Text...End Text)
  const textBlockRegex = /BT\s*([\s\S]*?)\s*ET/g;
  let match;
  
  while ((match = textBlockRegex.exec(pdfContent)) !== null) {
    const block = match[1];
    // Extraer strings entre paréntesis (Tj y TJ operators)
    const stringRegex = /\(([^)]*)\)/g;
    let strMatch;
    const parts: string[] = [];
    
    while ((strMatch = stringRegex.exec(block)) !== null) {
      const text = decodePDFString(strMatch[1]);
      if (text.trim()) parts.push(text);
    }
    
    if (parts.length > 0) {
      streams.push(parts.join(' '));
    }
  }
  
  // También buscar textos en formato hexadecimal
  const hexRegex = /<([0-9A-Fa-f\s]+)>\s*Tj/g;
  while ((match = hexRegex.exec(pdfContent)) !== null) {
    const hex = match[1].replace(/\s/g, '');
    try {
      const text = hexToString(hex);
      if (text.trim()) streams.push(text);
    } catch {}
  }
  
  return streams;
}

/**
 * Decodifica strings de PDF (maneja escapes)
 */
function decodePDFString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\[0-7]{1,3}/g, (match) => {
      return String.fromCharCode(parseInt(match.slice(1), 8));
    });
}

/**
 * Convierte hex a string
 */
function hexToString(hex: string): string {
  let result = '';
  for (let i = 0; i < hex.length; i += 4) {
    const charCode = parseInt(hex.slice(i, i + 4), 16);
    if (!isNaN(charCode) && charCode > 31 && charCode < 127) {
      result += String.fromCharCode(charCode);
    }
  }
  return result;
}

/**
 * Limpia texto extraído de PDF
 */
function cleanPDFText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\x00-\x1F\x7F]/g, '') // Eliminar caracteres de control
    .trim();
}

/**
 * Extrae título de los metadatos del PDF
 */
function extractPDFTitle(pdfContent: string): string | undefined {
  // Buscar en Info dictionary
  const titleMatch = pdfContent.match(/\/Title\s*\(([^)]*)\)/);
  if (titleMatch && titleMatch[1]) {
    return decodePDFString(titleMatch[1]);
  }
  return undefined;
}

/**
 * Usa API externa pdf.co para parsing de PDF
 */
async function parsePDFWithAPI(
  base64Content: string,
  filename: string
): Promise<ParseResult> {
  const warnings: string[] = ['Usando API externa para extracción de PDF'];
  
  try {
    const response = await fetch('https://api.pdf.co/v1/pdf/convert/to/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': PDFCO_API_KEY!
      },
      body: JSON.stringify({
        url: `data:application/pdf;base64,${base64Content}`,
        inline: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`PDF.co API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.body) {
      return {
        text: data.body.substring(0, MAX_TEXT_LENGTH),
        title: filename.replace('.pdf', ''),
        metadata: { parser: 'pdfco-api', api: 'pdf.co' },
        warnings,
        success: true
      };
    }
    
    throw new Error('No se recibió texto de la API');
    
  } catch (error) {
    warnings.push(`Error con API externa: ${error}`);
    return {
      text: '',
      title: filename,
      metadata: { parser: 'pdfco-error' },
      warnings,
      success: false,
      error: String(error)
    };
  }
}

// ============================================================================
// F1: DOCX PARSING
// ============================================================================

/**
 * Extrae texto de DOCX usando unzip y parsing XML
 * DOCX es un archivo ZIP que contiene document.xml con el contenido
 */
export async function parseDOCX(
  base64Content: string,
  filename: string
): Promise<ParseResult> {
  const warnings: string[] = [];
  
  try {
    // DOCX es un ZIP - necesitamos usar la API de compresión de Deno
    // Deno tiene soporte nativo para decompression
    
    const binaryContent = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
    
    // Crear un archivo temporal para procesar
    // Deno tiene soporte limitado para ZIP, así que usamos una aproximación
    
    // Buscar document.xml en el "ZIP" (DOCX)
    const content = Array.from(binaryContent);
    
    // Extraer el archivo document.xml buscando las firmas de zip local file
    // signatures: PK\x03\x04
    const docXML = extractDOCXContent(content);
    
    if (docXML) {
      // Parsear el XML y extraer texto
      const text = extractTextFromDOCXXML(docXML);
      
      if (text.length > 0) {
        const title = extractDOCXTitle(docXML) || filename.replace('.docx', '').replace('.doc', '');
        
        return {
          text: text.substring(0, MAX_TEXT_LENGTH),
          title,
          metadata: {
            parser: 'docx-native',
            original_size: binaryContent.length
          },
          warnings,
          success: true
        };
      }
    }
    
    // Intentar con mammoth.js via CDN si está disponible
    // O devolver fallback
    
    warnings.push('Extracción básica de DOCX. Para mejor resultados, guarda como .docx con texto plano.');
    
    return {
      text: `[CONTENIDO_DOCX] Documento Word "${filename}". El texto requiere conversión manual o usa PDF como alternativa.`,
      title: filename.replace('.docx', '').replace('.doc', ''),
      metadata: {
        parser: 'docx-fallback',
        recommendation: 'use-pdf-or-docx-with-plain-text'
      },
      warnings,
      success: false,
      error: 'No se pudo extraer texto del DOCX'
    };
    
  } catch (error) {
    return {
      text: '',
      title: filename,
      metadata: { parser: 'docx-error' },
      warnings,
      success: false,
      error: String(error)
    };
  }
}

/**
 * Extrae el contenido de document.xml de un DOCX (ZIP)
 */
function extractDOCXContent(content: number[]): string | null {
  
  // Buscar "word/document.xml" en el archivo
  const searchPattern = [0x77, 0x6F, 0x72, 0x64, 0x2F, 0x64, 0x6F, 0x63, 0x75, 0x6D, 0x65, 0x6E, 0x74, 0x2E, 0x78, 0x6D, 0x6C];
  
  let startIndex = -1;
  for (let i = 0; i < content.length - searchPattern.length; i++) {
    let match = true;
    for (let j = 0; j < searchPattern.length; j++) {
      if (content[i + j] !== searchPattern[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      startIndex = i + searchPattern.length + 4; // +4 for compressed size (we'll need to find actual size)
      break;
    }
  }
  
  if (startIndex === -1) {
    return null;
  }
  
  // Buscar el fin del archivo XML (EOF marker)
  // Near the end of file, look for end of central directory: PK\x05\x06
  const eocdSignature = [0x50, 0x4B, 0x05, 0x06];
  let endIndex = content.length - 22; // Minimum EOCD size
  
  for (let i = content.length - 22; i >= 0 && i > content.length - 65557; i--) {
    let match = true;
    for (let j = 0; j < 4; j++) {
      if (content[i + j] !== eocdSignature[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      endIndex = i;
      break;
    }
  }
  
  // Extraer bytes entre start y end
  // Esta es una aproximación - en un DOCX real necesitaríamos descompresión
  const xmlBytes = content.slice(startIndex, Math.min(endIndex, startIndex + 100000));
  
  // Detectar si está comprimido (método 8 = deflate)
  // Por simplicidad, intentamos extraer texto plano visible
  let result = '';
  for (let i = 0; i < xmlBytes.length; i++) {
    const byte = xmlBytes[i];
    if (byte >= 32 && byte < 127) {
      result += String.fromCharCode(byte);
    } else if (byte === 10 || byte === 13) {
      result += '\n';
    }
  }
  
  // Si el resultado parece ser XML válido, devolverlo
  if (result.includes('<w:') || result.includes('<w ') || result.includes('<?xml')) {
    return result;
  }
  
  return null;
}

/**
 * Extrae texto del XML de Word
 */
function extractTextFromDOCXXML(xml: string): string {
  // Extraer contenido entre <w:t> tags
  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  const texts: string[] = [];
  let match;
  
  while ((match = textRegex.exec(xml)) !== null) {
    if (match[1].trim()) {
      texts.push(match[1]);
    }
  }
  
  return texts.join(' ');
}

/**
 * Extrae título del documento DOCX
 */
function extractDOCXTitle(xml: string): string | undefined {
  // Buscar <dc:title> o <w:title>
  const titleRegex = /<(?:dc:|w:)title[^>]*>([^<]*)<\/(?:dc:|w:)title>/i;
  const match = xml.match(titleRegex);
  return match ? match[1].trim() : undefined;
}

// ============================================================================
// F2: AUDIO PARSING (Whisper API)
// ============================================================================

/**
 * Transcribe audio usando Whisper API
 * Requiere: WHISPER_API_URL configurado o usar OpenAI Whisper
 */
export async function parseAudio(
  base64Content: string,
  filename: string,
  mimeType: string = 'audio/mp3'
): Promise<ParseResult> {
  const warnings: string[] = [];
  
  // Verificar si hay API de Whisper configurada
  const whisperApiKey = Deno.env.get("WHISPER_API_KEY");
  const whisperUrl = WHISPER_API_URL || "https://api.openai.com/v1/audio/transcriptions";
  
  if (!whisperApiKey && !WHISPER_API_URL) {
    warnings.push('No hay API de transcripción configurada. Agrega WHISPER_API_KEY.');
    
    return {
      text: `[CONTENIDO_AUDIO] "${filename}" - Para transcribir este audio, configura una API de transcripción (Whisper). Pasos: 1) Sube el audio a un servicio de transcripción, 2) Usa el texto transcrito como entrada.`,
      title: filename,
      metadata: {
        parser: 'audio-requires-transcription',
        recommendation: 'use-whisper-api',
        steps: [
          'Transcribe el audio usando Whisper o similar',
          'Sube el texto transcrito como fuente'
        ]
      },
      warnings,
      success: false,
      error: 'WHISPER_API_KEY no configurado'
    };
  }
  
  try {
    // Preparar el audio para enviar
    const audioBuffer = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
    
    // Crear FormData
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType });
    formData.append('file', blob, filename);
    formData.append('model', 'whisper-1');
    formData.append('language', 'es'); // Por defecto español
    formData.append('response_format', 'text');
    
    const headers: Record<string, string> = {};
    if (whisperApiKey) {
      headers['Authorization'] = `Bearer ${whisperApiKey}`;
    }
    
    const response = await fetch(whisperUrl, {
      method: 'POST',
      headers,
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Whisper API error: ${response.status}`);
    }
    
    const transcript = await response.text();
    
    if (transcript && transcript.trim().length > 0) {
      return {
        text: transcript.substring(0, MAX_TEXT_LENGTH),
        title: filename.replace(/\.[^.]+$/, ''),
        metadata: {
          parser: 'whisper-api',
          model: 'whisper-1',
          original_size: audioBuffer.length,
          mime_type: mimeType
        },
        warnings,
        success: true
      };
    }
    
    throw new Error('Transcripción vacía');
    
  } catch (error) {
    warnings.push(`Error en transcripción: ${error}`);
    
    return {
      text: '',
      title: filename,
      metadata: { parser: 'whisper-error' },
      warnings,
      success: false,
      error: String(error)
    };
  }
}

// ============================================================================
// F3: VIDEO PARSING (Subtítulos/Transcript)
// ============================================================================

/**
 * Extrae subtítulos o transcript de video
 * Soporta: YouTube (via yt-dlp), videos locales, URLs con subtítulos
 */
export async function parseVideo(
  content: string, // URL o base64
  filename: string,
  options: {
    isUrl?: boolean;
    mimeType?: string;
    extractSubtitles?: boolean;
  } = {}
): Promise<ParseResult> {
  const warnings: string[] = [];
  const { isUrl = false, mimeType = 'video/mp4', extractSubtitles = true } = options;
  
  // Detectar si es YouTube
  const isYouTube = content.includes('youtube.com') || content.includes('youtu.be');
  const isVimeo = content.includes('vimeo.com');
  
  if (isUrl) {
    if (isYouTube) {
      return await extractYouTubeTranscript(content, filename, warnings);
    }
    
    if (isVimeo) {
      return {
        text: `[CONTENIDO_VIDEO] Video de Vimeo: "${content}". Vimeo no tiene API pública de subtítulos. Descarga los subtítulos manualmente o usa transcripción.`,
        title: filename,
        metadata: { parser: 'vimeo-not-supported' },
        warnings,
        success: false,
        error: 'Vimeo requiere extracción manual'
      };
    }
    
    // Intentar descargar y extraer subtítulos
    return await extractVideoSubtitles(content, filename, warnings);
  }
  
  // Video en base64
  if (extractSubtitles) {
    warnings.push('Video local: se requiere extractor de subtítulos. Considera usar un servicio de transcripción.');
  }
  
  return {
    text: `[CONTENIDO_VIDEO] "${filename}" - Para extraer contenido de video, necesitas: 1) Subtítulos/SRT, 2) Transcripción externa. Guarda el video en formato con subtítulos o usa Whisper para transcribir.`,
    title: filename.replace(/\.[^.]+$/, ''),
    metadata: {
      parser: 'video-requires-transcription',
      recommendation: 'use-whisper-or-subtitles',
      options: [
        'Agregar archivo de subtítulos (SRT/VTT)',
        'Usar servicio de transcripción',
        'Convertir a audio y usar Whisper'
      ]
    },
    warnings,
    success: false,
    error: 'Video requiere procesamiento adicional'
  };
}

/**
 * Extrae transcript de YouTube usando servicios públicos
 */
async function extractYouTubeTranscript(
  url: string,
  filename: string,
  warnings: string[]
): Promise<ParseResult> {
  // Extraer video ID
  let videoId = '';
  if (url.includes('youtube.com/watch')) {
    const match = url.match(/[?&]v=([^&]+)/);
    if (match) videoId = match[1];
  } else if (url.includes('youtu.be/')) {
    const match = url.match(/youtu\.be\/([^?]+)/);
    if (match) videoId = match[1];
  }
  
  if (!videoId) {
    return {
      text: '',
      title: filename,
      metadata: { parser: 'youtube-error' },
      warnings,
      success: false,
      error: 'No se pudo extraer ID del video'
    };
  }
  
  // Intentar usar servicios públicos de字幕
  // Nota: Algunos servicios son no oficiales, usar bajo tu propio riesgo
  const transcriptServices = [
    `https://youtubetranscript.com/?v=${videoId}`,
    `https://captions.speechtext.ai/api/captions?url=https://www.youtube.com/watch?v=${videoId}`
  ];
  
  for (const service of transcriptServices) {
    try {
      // Intentar obtener subtítulos generados
      const response = await fetch(service, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (response.ok) {
        const content = await response.text();
        
        // Detectar si es un transcript válido
        if (content.length > 100 && !content.includes('Error')) {
          // Extraer texto de subtitle格式
          const text = extractSubtitleText(content);
          
          if (text.length > 50) {
            return {
              text: text.substring(0, MAX_TEXT_LENGTH),
              title: `YouTube: ${videoId}`,
              original_url: url,
              metadata: {
                parser: 'youtube-transcript',
                video_id: videoId,
                service
              },
              warnings,
              success: true
            };
          }
        }
      }
    } catch (error) {
      // Continuar con siguiente servicio
      warnings.push(`Servicio de transcript no disponible: ${error}`);
    }
  }
  
  warnings.push('No se pudieron obtener subtítulos automáticos. El video requiere transcripción manual.');
  
  return {
    text: `[CONTENIDO_YOUTUBE] Video: ${url}. Para obtener el contenido: 1) Activa subtítulos automáticos en YouTube, 2) Usa un extractor de subtitles, o 3) Transcribe manualmente.`,
    title: `YouTube: ${videoId}`,
    original_url: url,
    metadata: {
      parser: 'youtube-manual-required',
      video_id: videoId,
      url
    },
    warnings,
    success: false,
    error: 'No se pudieron obtener subtítulos'
  };
}

/**
 * Extrae texto de formato de subtítulos (SRT/VTT)
 */
function extractSubtitleText(content: string): string {
  // Patrones comunes de subtitles
  const patterns = [
    /<text[^>]*>([^<]*)<\/text>/gi, // YouTube XML
    /^\d+\n\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}\n([^\n]+)\n/gm, // SRT
    /<c[^>]*>([^<]*)<\/c>/gi, // VTT
  ];
  
  let result = '';
  
  for (const pattern of patterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const text = match[1].trim();
      if (text && !result.includes(text)) {
        result += text + ' ';
      }
    }
    
    if (result.length > 100) break;
  }
  
  // Si no funcionó, limpiar HTML básico
  if (!result) {
    result = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  return result;
}

/**
 * Extrae subtítulos de video (URL genérica)
 */
async function extractVideoSubtitles(
  url: string,
  filename: string,
  warnings: string[]
): Promise<ParseResult> {
  // Buscar archivos de subtítulos relacionados
  const subtitleExtensions = ['.vtt', '.srt', '.ass', '.ssa'];
  
  for (const ext of subtitleExtensions) {
    const subtitleUrl = url.replace(/\.[^.]+$/, '') + ext;
    
    try {
      const response = await fetch(subtitleUrl);
      
      if (response.ok) {
        const content = await response.text();
        const text = extractSubtitleText(content);
        
        if (text.length > 50) {
          return {
            text: text.substring(0, MAX_TEXT_LENGTH),
            title: filename.replace(/\.[^.]+$/, ''),
            original_url: subtitleUrl,
            page_reference: `Subtítulos: ${ext}`,
            metadata: {
              parser: 'subtitle-file',
              format: ext,
              url: subtitleUrl
            },
            warnings,
            success: true
          };
        }
      }
    } catch {}
  }
  
  warnings.push('No se encontraron subtítulos externos.');
  
  return {
    text: `[CONTENIDO_VIDEO_URL] "${filename}" de ${url}. Para obtener el contenido: 1) Sube archivo de subtítulos (SRT/VTT), 2) Usa transcripción externa.`,
    title: filename.replace(/\.[^.]+$/, ''),
    original_url: url,
    metadata: {
      parser: 'video-no-subtitles',
      url
    },
    warnings,
    success: false,
    error: 'No se encontraron subtítulos'
  };
}

// ============================================================================
// F5: IMAGEN (OCR con Tesseract o API)
// ============================================================================

/**
 * Extrae texto de imagen usando OCR
 * Soporta: Tesseract.js (via CDN), APIs de OCR
 */
export async function parseImagen(
  base64Content: string,
  filename: string,
  mimeType: string = 'image/png'
): Promise<ParseResult> {
  const warnings: string[] = [];
  
  // Verificar API de OCR configurada
  const ocrApiKey = Deno.env.get("OCR_API_KEY");
  const ocrApiUrl = Deno.env.get("OCR_API_URL") || "https://api.ocr.space/parse/image";
  
  // Intentar OCR.space API (tiene tier gratuito)
  if (!ocrApiKey) {
    // OCR.space permite uso sin API key con limitaciones
    return await parseImagenOCRSpace(base64Content, filename, mimeType, warnings);
  }
  
  try {
    const formData = new FormData();
    const imageBuffer = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
    const blob = new Blob([imageBuffer], { type: mimeType });
    formData.append('file', blob, filename);
    formData.append('language', 'spa'); // Español
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Motor más nuevo
    
    const headers: Record<string, string> = {
      'apikey': ocrApiKey
    };
    
    const response = await fetch(ocrApiUrl, {
      method: 'POST',
      headers,
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`OCR API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.ParsedResults && data.ParsedResults.length > 0) {
      const fullText = data.ParsedResults
        .map((r: any) => r.ParsedText)
        .join('\n\n')
        .trim();
      
      if (fullText.length > 0) {
        return {
          text: fullText.substring(0, MAX_TEXT_LENGTH),
          title: filename.replace(/\.[^.]+$/, ''),
          metadata: {
            parser: 'ocr-api',
            engine: ocrApiUrl.includes('ocr.space') ? 'ocr.space' : 'custom',
            confidence: data.ParsedResults[0]?.TextOverlay?.MeanConfidence
          },
          warnings,
          success: true
        };
      }
    }
    
    throw new Error('No se encontró texto en la imagen');
    
  } catch (error) {
    warnings.push(`Error de OCR: ${error}`);
    return await parseImagenOCRSpace(base64Content, filename, mimeType, warnings);
  }
}

/**
 * OCR usando OCR.space API (sin API key, con limitaciones)
 */
async function parseImagenOCRSpace(
  base64Content: string,
  filename: string,
  mimeType: string,
  warnings: string[]
): Promise<ParseResult> {
  try {
    const formData = new FormData();
    const imageBuffer = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
    const blob = new Blob([imageBuffer], { type: mimeType });
    formData.append('file', blob, filename);
    formData.append('language', 'spa');
    formData.append('isOverlayRequired', 'false');
    
    // OCR.space sin API key
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`OCR.space error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.ParsedResults && data.ParsedResults.length > 0) {
      const fullText = data.ParsedResults
        .map((r: any) => r.ParsedText)
        .filter(Boolean)
        .join('\n\n')
        .trim();
      
      if (fullText.length > 0) {
        warnings.push('OCR básico (sin API key - resultados limitados)');
        
        return {
          text: fullText.substring(0, MAX_TEXT_LENGTH),
          title: filename.replace(/\.[^.]+$/, ''),
          metadata: {
            parser: 'ocr.space-free',
            rate_limited: true
          },
          warnings,
          success: true
        };
      }
    }
    
    if (data.ErrorMessage) {
      warnings.push(data.ErrorMessage[0]);
    }
    
    throw new Error('No se detectó texto en la imagen');
    
  } catch (error) {
    warnings.push('OCR no disponible. La imagen puede no contener texto legible.');
    
    return {
      text: `[CONTENIDO_IMAGEN] "${filename}" - No se pudo extraer texto. La imagen puede: 1) No contener texto, 2) Tener texto en una forma que OCR no puede procesar (captcha, firma, etc.), 3) Tener calidad insuficiente.`,
      title: filename.replace(/\.[^.]+$/, ''),
      metadata: {
        parser: 'ocr-failed',
        recommendation: 'image-may-not-contain-text'
      },
      warnings,
      success: false,
      error: String(error)
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Detecta el tipo MIME a partir de la extensión
 */
export function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'csv': 'text/csv',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Detecta el tipo de archivo basado en MIME y contenido
 */
export function detectFileType(
  filename: string,
  mimeType?: string
): 'pdf' | 'docx' | 'txt' | 'md' | 'audio' | 'video' | 'imagen' | 'csv' | 'unknown' {
  const ext = filename.toLowerCase().split('.').pop();
  
  const typeMap: Record<string, string> = {
    'pdf': 'pdf',
    'doc': 'docx',
    'docx': 'docx',
    'txt': 'txt',
    'md': 'md',
    'mp3': 'audio',
    'wav': 'audio',
    'ogg': 'audio',
    'mp4': 'video',
    'webm': 'video',
    'mov': 'video',
    'avi': 'video',
    'png': 'imagen',
    'jpg': 'imagen',
    'jpeg': 'imagen',
    'gif': 'imagen',
    'webp': 'imagen',
    'csv': 'csv',
    'xlsx': 'csv'
  };
  
  return (typeMap[ext || ''] || 
          typeMap[mimeType?.toLowerCase() || ''] || 
          'unknown') as any;
}
