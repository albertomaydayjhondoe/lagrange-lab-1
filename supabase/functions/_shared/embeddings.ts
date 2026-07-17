// Shared embeddings utility for RAG
// Generates embeddings using OpenAI-compatible API

const AI_GATEWAY_URL = (Deno.env.get("AI_GATEWAY_URL") ?? "https://api.openai.com/v1").replace(/\/$/, "");
const AI_EMBEDDING_MODEL = Deno.env.get("AI_EMBEDDING_MODEL") ?? "text-embedding-3-small";

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate embedding for a text using OpenAI-compatible API
 */
export async function getEmbedding(
  text: string,
  apiKey: string,
  model: string = AI_EMBEDDING_MODEL
): Promise<number[]> {
  const startTime = Date.now();
  
  const response = await fetch(`${AI_GATEWAY_URL}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      input: text.slice(0, 8000), // Token limit safety
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Embedding API error:", response.status, errorText);
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.data?.[0]?.embedding) {
    throw new Error("No embedding returned from API");
  }

  return data.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function getEmbeddingsBatch(
  texts: string[],
  apiKey: string,
  model: string = AI_EMBEDDING_MODEL
): Promise<number[][]> {
  const response = await fetch(`${AI_GATEWAY_URL}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      input: texts.map(t => t.slice(0, 8000)),
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data.map((item: any) => item.embedding);
}

/**
 * Generate embedding and return full result
 */
export async function generateEmbedding(
  text: string,
  apiKey: string,
  model: string = AI_EMBEDDING_MODEL
): Promise<EmbeddingResult> {
  const startTime = Date.now();
  
  const response = await fetch(`${AI_GATEWAY_URL}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      input: text.slice(0, 8000),
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  const embedding = data.data[0].embedding;

  return {
    embedding,
    model: data.model,
    usage: data.usage,
  };
}
