-- Enable Row Level Security on core content tables so policies are enforced
BEGIN;

ALTER TABLE IF EXISTS public.topology_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.topology_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.socratic_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.thematic_axes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.podcast_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.saved_dialogues ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.access_requests ENABLE ROW LEVEL SECURITY;

COMMIT;
