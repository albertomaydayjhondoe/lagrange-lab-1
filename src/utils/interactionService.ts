import { supabase } from '@/integrations/supabase/client';

// Generate a unique session ID for anonymous users
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('lagrange_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('lagrange_session_id', sessionId);
  }
  return sessionId;
}

export interface InteractionData {
  nodeId: string;
  interactionType: 'click' | 'hover' | 'explore' | 'question_viewed';
  tensionLevel?: number;
}

export async function saveInteraction(data: InteractionData): Promise<void> {
  const sessionId = getSessionId();
  
  // Get current user if authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  try {
    const { error } = await supabase
      .from('user_interactions')
      .insert({
        user_id: user?.id || null,
        session_id: sessionId,
        node_id: data.nodeId,
        interaction_type: data.interactionType,
        tension_level: data.tensionLevel || 0,
      });

    if (error) {
      console.error('Error saving interaction:', error);
    }
  } catch (err) {
    console.error('Failed to save interaction:', err);
  }
}

export async function getUserInteractionHistory(limit = 50): Promise<any[]> {
  const sessionId = getSessionId();
  const { data: { user } } = await supabase.auth.getUser();
  
  try {
    let query = supabase
      .from('user_interactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (user) {
      query = query.eq('user_id', user.id);
    } else {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching interactions:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Failed to fetch interactions:', err);
    return [];
  }
}

export async function getNodeInteractionCount(nodeId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('user_interactions')
      .select('*', { count: 'exact', head: true })
      .eq('node_id', nodeId);
    
    if (error) {
      console.error('Error counting interactions:', error);
      return 0;
    }
    
    return count || 0;
  } catch (err) {
    console.error('Failed to count interactions:', err);
    return 0;
  }
}

export async function getMostInteractedNodes(limit = 5): Promise<{ nodeId: string; count: number }[]> {
  try {
    const { data, error } = await supabase
      .from('user_interactions')
      .select('node_id');
    
    if (error) {
      console.error('Error fetching most interacted nodes:', error);
      return [];
    }
    
    // Count occurrences client-side
    const counts = (data || []).reduce((acc: Record<string, number>, item) => {
      acc[item.node_id] = (acc[item.node_id] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(counts)
      .map(([nodeId, count]) => ({ nodeId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (err) {
    console.error('Failed to get most interacted nodes:', err);
    return [];
  }
}
