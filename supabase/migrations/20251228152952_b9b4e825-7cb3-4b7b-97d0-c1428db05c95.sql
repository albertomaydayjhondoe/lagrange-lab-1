-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Anyone can insert interactions" ON public.user_interactions;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can insert interactions"
ON public.user_interactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Update SELECT policy to only allow viewing own interactions
DROP POLICY IF EXISTS "Users can view their own interactions" ON public.user_interactions;

CREATE POLICY "Authenticated users can view their own interactions"
ON public.user_interactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);