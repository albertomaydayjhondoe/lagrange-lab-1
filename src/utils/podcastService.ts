import { supabase } from '@/compartido/lib/supabaseClient';

export interface EpisodeData {
  title: string;
  description?: string;
  eje?: string;
  questionIds?: string[];
  published?: boolean;
}

export interface StorageResult {
  success: boolean;
  episode?: {
    id: string;
    title: string;
    description: string | null;
    audio_url: string;
    eje: string | null;
    published: boolean | null;
    published_at: string | null;
    created_at: string;
  };
  storage?: {
    supabase: { success: boolean; url?: string };
    github: { success?: boolean; url?: string; error?: string; configured?: boolean };
  };
  error?: string;
}

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  duration_seconds: number | null;
  eje: string | null;
  question_ids: string[] | null;
  published: boolean | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Uploads a podcast episode to both Supabase Storage and GitHub (if configured)
 */
export async function uploadPodcastEpisode(
  audioBase64: string,
  fileName: string,
  episodeData: EpisodeData
): Promise<StorageResult> {
  try {
    const { data, error } = await supabase.functions.invoke('podcast-storage', {
      body: {
        action: 'upload',
        audioBase64,
        fileName,
        episodeData,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data as StorageResult;
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Lists all podcast episodes from the database
 */
export async function listPodcastEpisodes(): Promise<PodcastEpisode[]> {
  try {
    const { data, error } = await supabase
      .from('podcast_episodes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('List episodes error:', error);
    return [];
  }
}

/**
 * Lists published podcast episodes
 */
export async function listPublishedEpisodes(): Promise<PodcastEpisode[]> {
  try {
    const { data, error } = await supabase
      .from('podcast_episodes')
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('List published episodes error:', error);
    return [];
  }
}

/**
 * Deletes a podcast episode from database and storage
 */
export async function deletePodcastEpisode(
  episodeId: string,
  fileName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('podcast-storage', {
      body: {
        action: 'delete',
        episodeId,
        fileName,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    console.error('Delete error:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Updates episode publish status
 */
export async function updateEpisodeStatus(
  episodeId: string,
  published: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('podcast_episodes')
      .update({
        published,
        published_at: published ? new Date().toISOString() : null,
      })
      .eq('id', episodeId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Update status error:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Converts a Blob to base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
