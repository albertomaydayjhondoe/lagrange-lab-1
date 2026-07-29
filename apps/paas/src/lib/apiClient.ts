// Custom API Client for Lagrange Lab
// Replaces Supabase when using Docker self-hosted

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface User {
  id: string;
  email: string;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Academy {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_public: boolean;
  primary_color?: string;
}

export interface TutoringResponse {
  response: string;
  academy_id: string;
  space_id?: string;
  response_time_ms: number;
  has_inference_only: boolean;
}

// Store token
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('lagrange_token', token);
  } else {
    localStorage.removeItem('lagrange_token');
  }
}

export function getAuthToken(): string | null {
  if (!authToken) {
    authToken = localStorage.getItem('lagrange_token');
  }
  return authToken;
}

// API Request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Auth API
export const authApi = {
  register: (email: string, password: string) =>
    apiRequest<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => apiRequest<{ user: User }>('/api/auth/me'),
};

// Academies API
export const academiesApi = {
  list: () => apiRequest<{ academies: Academy[] }>('/api/academies'),
  get: (id: string) => apiRequest<{ academy: Academy }>(`/api/academies/${id}`),
  create: (data: { name: string; slug: string; description?: string; isPublic?: boolean }) =>
    apiRequest<{ academy: Academy }>('/api/academies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Spaces API
export const spacesApi = {
  list: (academyId?: string) =>
    apiRequest<{ spaces: any[] }>(`/api/spaces${academyId ? `?academyId=${academyId}` : ''}`),
  create: (academyId: string, name: string, slug?: string, description?: string) =>
    apiRequest<{ space: any }>('/api/spaces', {
      method: 'POST',
      body: JSON.stringify({ academyId, name, slug, description }),
    }),
};

// Oracle API (Tutoring & Socratic)
export const oracleApi = {
  tutoring: (academyId: string, question: string, conversationHistory?: { role: 'user' | 'assistant'; content: string }[], spaceId?: string) =>
    apiRequest<TutoringResponse>('/api/oracles/tutoring', {
      method: 'POST',
      body: JSON.stringify({ academyId, spaceId, question, conversationHistory }),
    }),

  socratic: (academyId: string, context?: string, eje?: string) =>
    apiRequest<{ pregunta: string; eje: string; nivel: number; tension: number }>('/api/oracles/socratic', {
      method: 'POST',
      body: JSON.stringify({ academyId, context, eje }),
    }),
};

// RAG API
export const ragApi = {
  ingest: (academyId: string, content: string, sourceType: string = 'txt', title?: string) =>
    apiRequest<{ chunks_created: number; status: string }>('/api/rag/ingest', {
      method: 'POST',
      body: JSON.stringify({ academyId, content, sourceType, title }),
    }),
};

// Health check
export const healthCheck = () =>
  fetch(`${API_BASE}/health`).then(r => r.json());
