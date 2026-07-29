-- Create access requests table
CREATE TABLE public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text
);

-- Enable RLS
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a request (even anonymous)
CREATE POLICY "Anyone can submit access request"
ON public.access_requests
FOR INSERT
WITH CHECK (true);

-- Only admins can view all requests
CREATE POLICY "Admins can view all requests"
ON public.access_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update requests
CREATE POLICY "Admins can update requests"
ON public.access_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete requests
CREATE POLICY "Admins can delete requests"
ON public.access_requests
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));