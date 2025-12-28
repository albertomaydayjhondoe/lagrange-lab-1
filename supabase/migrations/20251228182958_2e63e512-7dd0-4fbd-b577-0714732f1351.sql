-- Update handle_new_user function to also assign 'platon' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, display_name, role)
  VALUES (new.id, new.raw_user_meta_data ->> 'display_name', 'user');
  
  -- Assign 'platon' role to all new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'platon');
  
  RETURN new;
END;
$$;

-- Assign 'platon' role to all existing users who don't have it yet
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'platon'::app_role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.user_id AND ur.role = 'platon'
);