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

export async function saveInteraction(data: InteractionData): Promise<boolean> {
  // Get current user - authentication required
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // User not authenticated, don't save interaction
    return false;
  }

  const sessionId = getSessionId();
  
  try {
    const { error } = await supabase
      .from('user_interactions')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        node_id: data.nodeId,
        interaction_type: data.interactionType,
        tension_level: data.tensionLevel || 0,
      });

    if (error) {
      console.error('Error saving interaction:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Failed to save interaction:', err);
    return false;
  }
}

export async function getUserInteractionHistory(limit = 50): Promise<any[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('user_interactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    
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
