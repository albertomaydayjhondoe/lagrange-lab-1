import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.run/@supabase/supabase-js@2";
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { getAcademyContext } from "../_shared/academyContext.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StorageRequest {
  action: 'upload' | 'list' | 'delete';
  academyId?: string;
  audioBase64?: string;
  fileName?: string;
  episodeData?: {
    title: string;
    description?: string;
    eje?: string;
    questionIds?: string[];
    published?: boolean;
  };
  episodeId?: string;
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

async function uploadToGitHub(
  audioBase64: string,
  fileName: string,
  githubToken: string,
  repoOwner: string,
  repoName: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const path = `podcast-episodes/${fileName}`;
    
    // Check if file exists
    const checkResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`,
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    let sha: string | undefined;
    if (checkResponse.ok) {
      const existingFile = await checkResponse.json();
      sha = existingFile.sha;
    }

    // Upload/Update file
    const uploadResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Add podcast episode: ${fileName}`,
          content: audioBase64,
          branch: 'main',
          ...(sha && { sha }),
        }),
      }
    );

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      console.error('GitHub upload error:', error);
      return { success: false, error: `GitHub upload failed: ${uploadResponse.status}` };
    }

    const result = await uploadResponse.json();
    return { 
      success: true, 
      url: result.content?.download_url || `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/${path}` 
    };
  } catch (error) {
    console.error('GitHub upload error:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function uploadToSupabaseStorage(
  supabaseClient: any,
  audioBase64: string,
  fileName: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Convert base64 to Uint8Array
    const audioData = base64Decode(audioBase64);
    
    const { error: uploadError } = await supabaseClient.storage
      .from('podcast-episodes')
      .upload(fileName, audioData, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase storage error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: urlData } = supabaseClient.storage
      .from('podcast-episodes')
      .getPublicUrl(fileName);

    return { success: true, url: urlData.publicUrl };
  } catch (error) {
    console.error('Supabase storage error:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function createEpisodeMetadataFile(
  githubToken: string,
  repoOwner: string,
  repoName: string,
  episodeData: {
    id: string;
    title: string;
    description?: string;
    eje?: string;
    audioFileName: string;
    supabaseUrl: string;
    githubUrl?: string;
    createdAt: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Read existing episodes.json or create new
    const path = 'src/data/media/episodes.json';
    
    const checkResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`,
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    let existingEpisodes: unknown[] = [];
    let sha: string | undefined;

    if (checkResponse.ok) {
      const file = await checkResponse.json();
      sha = file.sha;
      const content = atob(file.content);
      existingEpisodes = JSON.parse(content);
    }

    // Add new episode metadata
    existingEpisodes.push(episodeData);

    // Upload updated metadata
    const uploadResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Update episodes metadata: ${episodeData.title}`,
          content: btoa(JSON.stringify(existingEpisodes, null, 2)),
          branch: 'main',
          ...(sha && { sha }),
        }),
      }
    );

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      console.error('GitHub metadata update error:', error);
      return { success: false, error: `Metadata update failed: ${uploadResponse.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('GitHub metadata error:', error);
    return { success: false, error: (error as Error).message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const { user, supabase: authSupabase, isPlatformAdmin, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: authError || 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: StorageRequest = await req.json();
    const { action, academyId: requestedAcademyId } = body;

    // Platform admins have full access, otherwise validate academy membership
    let academyId: string;
    let isAcademyAdmin = false;
    if (!isPlatformAdmin) {
      const academyContext = await getAcademyContext(authSupabase, user.id, requestedAcademyId);
      academyId = academyContext.academyId;
      isAcademyAdmin = academyContext.role === 'owner' || academyContext.role === 'admin' || academyContext.role === 'platon';
      if (!isAcademyAdmin) {
        return new Response(
          JSON.stringify({ error: 'Academy member access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Platform admin: use requested academy or genesis
      academyId = requestedAcademyId || '00000000-0000-0000-0000-000000000001';
      isAcademyAdmin = true;
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const githubToken = Deno.env.get('GITHUB_TOKEN');
    const githubRepoOwner = Deno.env.get('GITHUB_REPO_OWNER');
    const githubRepoName = Deno.env.get('GITHUB_REPO_NAME');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const hasGitHub = githubToken && githubRepoOwner && githubRepoName;

    if (action === 'upload') {
      // Academy admin only for upload
      if (!isAcademyAdmin) {
        return new Response(
          JSON.stringify({ error: 'Academy admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { audioBase64, fileName, episodeData } = body;

      if (!audioBase64 || !fileName || !episodeData) {
        return new Response(
          JSON.stringify({ error: 'audioBase64, fileName, and episodeData are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`User ${user.id} (academy: ${academyId}) uploading episode: ${fileName}`);

      // Upload to Supabase Storage (primary)
      const supabaseResult = await uploadToSupabaseStorage(supabase, audioBase64, fileName);
      
      if (!supabaseResult.success) {
        return new Response(
          JSON.stringify({ error: `Supabase upload failed: ${supabaseResult.error}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Upload to GitHub (secondary, if configured)
      let githubResult: { success: boolean; url?: string; error?: string } = { success: false };
      if (hasGitHub) {
        console.log('Uploading to GitHub...');
        githubResult = await uploadToGitHub(
          audioBase64,
          fileName,
          githubToken!,
          githubRepoOwner!,
          githubRepoName!
        );
        
        if (!githubResult.success) {
          console.warn('GitHub upload failed, continuing with Supabase only:', githubResult.error);
        }
      }

      // Create episode record in database (with academy_id)
      const { data: episode, error: insertError } = await supabase
        .from('podcast_episodes')
        .insert({
          title: episodeData.title,
          description: episodeData.description,
          audio_url: supabaseResult.url,
          question_ids: episodeData.questionIds || [],
          eje: episodeData.eje,
          published: episodeData.published ?? false,
          published_at: episodeData.published ? new Date().toISOString() : null,
          academy_id: academyId,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Database insert error:', insertError);
        return new Response(
          JSON.stringify({ error: `Database insert failed: ${insertError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update GitHub metadata if GitHub is configured
      if (hasGitHub && githubResult.success) {
        await createEpisodeMetadataFile(
          githubToken!,
          githubRepoOwner!,
          githubRepoName!,
          {
            id: episode.id,
            title: episodeData.title,
            description: episodeData.description,
            eje: episodeData.eje,
            audioFileName: fileName,
            supabaseUrl: supabaseResult.url!,
            githubUrl: githubResult.url,
            createdAt: new Date().toISOString(),
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          episode,
          storage: {
            supabase: { success: true, url: supabaseResult.url },
            github: hasGitHub 
              ? { success: githubResult.success, url: githubResult.url, error: githubResult.error }
              : { configured: false },
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'list') {
      // All authenticated users can list (filtered by academy)
      const { data: episodes, error } = await supabase
        .from('podcast_episodes')
        .select('*')
        .eq('academy_id', academyId)
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ episodes }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      // Academy admin only for delete
      if (!isAcademyAdmin) {
        return new Response(
          JSON.stringify({ error: 'Academy admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { episodeId, fileName } = body;

      if (!episodeId) {
        return new Response(
          JSON.stringify({ error: 'episodeId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`User ${user.id} (academy: ${academyId}) deleting episode: ${episodeId}`);

      // Delete from database (filtered by academy)
      const { error: deleteError } = await supabase
        .from('podcast_episodes')
        .delete()
        .eq('id', episodeId)
        .eq('academy_id', academyId);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete from storage if fileName provided
      if (fileName) {
        await supabase.storage.from('podcast-episodes').remove([fileName]);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Storage function error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
