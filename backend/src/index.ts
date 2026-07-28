import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';

const { Pool } = pg;

// Config from env
const PORT = parseInt(process.env.PORT || '3001');
const DB_HOST = process.env.DB_HOST || 'db';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_NAME = process.env.DB_NAME || 'lagrange_lab';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'https://api.openai.com/v1';
const AI_CHAT_MODEL = process.env.AI_CHAT_MODEL || 'gpt-4o-mini';
const AI_EMBEDDING_MODEL = process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-small';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Database pool
const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  max: 20,
});

const query = (text: string, params?: any[]) => pool.query(text, params);

// Express app
const app = express();
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth middleware
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ============ AUTH ROUTES ============
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(6)
    }).parse(req.body);

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows[0]) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuid();
    
    await query(
      'INSERT INTO users (id, email, password_hash, created_at) VALUES ($1, $2, $3, NOW())',
      [userId, email, passwordHash]
    );
    await query(
      'INSERT INTO profiles (id, user_id, created_at) VALUES ($1, $1, NOW())',
      [userId]
    );

    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: userId, email } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string()
    }).parse(req.body);

    const user = await query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (!user.rows[0]) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ userId: user.rows[0].id, email: user.rows[0].email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.rows[0].id, email: user.rows[0].email } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  const user = await query('SELECT id, email, created_at FROM users WHERE id = $1', [(req as any).user.userId]);
  if (!user.rows[0]) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: user.rows[0] });
});

// ============ ACADEMIES ROUTES ============
app.get('/api/academies', async (req, res) => {
  const academies = await query('SELECT * FROM academies ORDER BY name');
  res.json({ academies: academies.rows });
});

app.get('/api/academies/:id', async (req, res) => {
  const academy = await query('SELECT * FROM academies WHERE id = $1', [req.params.id]);
  if (!academy.rows[0]) {
    res.status(404).json({ error: 'Academy not found' });
    return;
  }
  res.json({ academy: academy.rows[0] });
});

app.post('/api/academies', authenticate, async (req, res) => {
  const { name, slug, description, isPublic } = z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
    description: z.string().optional(),
    isPublic: z.boolean().default(true)
  }).parse(req.body);

  const academyId = uuid();
  const userId = (req as any).user.userId;

  await query(
    'INSERT INTO academies (id, name, slug, description, is_public, owner_user_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [academyId, name, slug, description || null, isPublic, userId]
  );
  await query(
    'INSERT INTO academy_members (id, academy_id, user_id, role) VALUES ($1, $2, $3, $4)',
    [uuid(), academyId, userId, 'owner']
  );

  const academy = await query('SELECT * FROM academies WHERE id = $1', [academyId]);
  res.status(201).json({ academy: academy.rows[0] });
});

// ============ SPACES ROUTES ============
app.get('/api/spaces', async (req, res) => {
  const { academyId } = req.query;
  let spaces;
  if (academyId) {
    spaces = await query(
      'SELECT * FROM academy_spaces WHERE academy_id = $1 AND is_active = true ORDER BY name',
      [academyId]
    );
  } else {
    spaces = await query('SELECT * FROM academy_spaces WHERE is_active = true ORDER BY name');
  }
  res.json({ spaces: spaces.rows });
});

app.post('/api/spaces', authenticate, async (req, res) => {
  const { academyId, name, slug, description } = z.object({
    academyId: z.string().uuid(),
    name: z.string().min(1),
    slug: z.string().optional(),
    description: z.string().optional()
  }).parse(req.body);

  const spaceId = uuid();
  await query(
    'INSERT INTO academy_spaces (id, academy_id, name, slug, description) VALUES ($1, $2, $3, $4, $5)',
    [spaceId, academyId, name, slug || null, description || null]
  );

  const space = await query('SELECT * FROM academy_spaces WHERE id = $1', [spaceId]);
  res.status(201).json({ space: space.rows[0] });
});

// ============ ORACLES ROUTES ============
app.post('/api/oracles/tutoring', authenticate, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { academyId, spaceId, question, conversationHistory } = z.object({
      academyId: z.string().uuid(),
      spaceId: z.string().uuid().optional(),
      question: z.string().min(1).max(3000),
      conversationHistory: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string()
      })).optional()
    }).parse(req.body);

    if (!AI_API_KEY) {
      res.status(500).json({ error: 'AI not configured' });
      return;
    }

    // Get academy info
    const academy = await query('SELECT name FROM academies WHERE id = $1', [academyId]);
    if (!academy.rows[0]) {
      res.status(404).json({ error: 'Academy not found' });
      return;
    }

    // Build prompt
    const systemPrompt = `Eres un tutor de IA especializado. Academia: ${academy.rows[0].name}. Responde de manera clara y didáctica.`;

    // Add conversation history
    const messages: any[] = [{ role: 'system', content: systemPrompt }];
    if (conversationHistory) {
      conversationHistory.slice(-10).forEach(msg => {
        messages.push({ role: msg.role, content: msg.content });
      });
    }
    messages.push({ role: 'user', content: question });

    // Call AI
    const response = await fetch(`${AI_GATEWAY_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: AI_CHAT_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error('AI API error');
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'No response';

    // Save history
    await query(
      'INSERT INTO tutoring_history (id, subject_id, student_id, question, ai_response) VALUES ($1, $2, $3, $4, $5)',
      [uuid(), academyId, (req as any).user.userId, question, aiResponse]
    );

    res.json({
      response: aiResponse,
      academy_id: academyId,
      space_id: spaceId,
      response_time_ms: Date.now() - startTime,
      has_inference_only: false
    });
  } catch (error) {
    console.error('Tutoring error:', error);
    res.status(500).json({ error: 'Tutoring failed' });
  }
});

app.post('/api/oracles/socratic', authenticate, async (req, res) => {
  try {
    const { academyId, context, eje } = z.object({
      academyId: z.string().uuid(),
      context: z.string().optional(),
      eje: z.string().optional()
    }).parse(req.body);

    if (!AI_API_KEY) {
      res.status(500).json({ error: 'AI not configured' });
      return;
    }

    const systemPrompt = `Eres el Oráculo Socrático. Formula preguntas profundas que:
- Cuestionen las asunciones subyacentes
- Expongan contradicciones en el razonamiento
- Aumenten gradualmente la tensión
- Sean breves y provocativas`;

    let userPrompt = 'Genera una pregunta socrática';
    if (context) userPrompt += ` basada en: "${context}"`;
    if (eje) userPrompt += ` sobre el eje: ${eje}`;

    const response = await fetch(`${AI_GATEWAY_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: AI_CHAT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.85,
        max_tokens: 500
      })
    });

    const data = await response.json();
    const pregunta = data.choices?.[0]?.message?.content || '¿Qué te hace pensar eso?';

    res.json({
      pregunta,
      eje: eje || 'Miedo',
      nivel: 2,
      tension: 0.8
    });
  } catch (error) {
    console.error('Socratic error:', error);
    res.status(500).json({ error: 'Socratic oracle failed' });
  }
});

// ============ RAG ROUTES ============
app.post('/api/rag/ingest', authenticate, async (req, res) => {
  try {
    const { academyId, content, sourceType, title } = z.object({
      academyId: z.string().uuid().optional(),
      content: z.string().min(1),
      sourceType: z.string().default('txt'),
      title: z.string().optional()
    }).parse(req.body);

    const effectiveAcademyId = academyId || '00000000-0000-0000-0000-000000000001';
    const userId = (req as any).user.userId;
    
    // Chunk text
    const chunks = content.split(/\n\n+/).filter(c => c.length > 50).slice(0, 10);
    let created = 0;

    for (const chunk of chunks) {
      let embedding = null;
      
      if (AI_API_KEY && chunk.length > 20) {
        try {
          const embedResponse = await fetch(`${AI_GATEWAY_URL}/embeddings`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${AI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: AI_EMBEDDING_MODEL,
              input: chunk.substring(0, 8000)
            })
          });
          const embedData = await embedResponse.json();
          embedding = `[${embedData.data?.[0]?.embedding?.join(',') || ''}]`;
        } catch (e) {
          console.warn('Embedding failed:', e);
        }
      }

      await query(`
        INSERT INTO corpus_fragments 
        (id, source_file, content, academy_id, embedding, source_type, title, ingested_at, uploaded_by)
        VALUES ($1, $2, $3, $4, ${embedding ? '$5::vector' : 'NULL'}, $6, $7, NOW(), $8)
      `, [
        uuid(),
        title || 'text_input',
        chunk,
        effectiveAcademyId,
        ...(embedding ? [embedding] : []),
        sourceType,
        title || 'text_input',
        userId
      ]);
      created++;
    }

    res.json({ chunks_created: created, status: 'completed' });
  } catch (error) {
    console.error('Ingest error:', error);
    res.status(500).json({ error: 'Ingest failed' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
async function start() {
  try {
    // Test database connection
    await query('SELECT 1');
    console.log('✅ Database connected');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Lagrange Lab API running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
}

start();
