-- Remove overly-permissive policies
DROP POLICY IF EXISTS "Allow public update" ON public.deployed_lockers;
DROP POLICY IF EXISTS "Allow public insert" ON public.deployed_lockers;
DROP POLICY IF EXISTS "Allow public delete" ON public.deployed_lockers;
DROP POLICY IF EXISTS "Anyone can update deployed_lockers" ON public.deployed_lockers;
DROP POLICY IF EXISTS "Anyone can insert deployed_lockers" ON public.deployed_lockers;

-- Ensure RLS is on
ALTER TABLE public.deployed_lockers ENABLE ROW LEVEL SECURITY;

-- Public read-only access (showcase pages need this)
DROP POLICY IF EXISTS "Public read access" ON public.deployed_lockers;
CREATE POLICY "Public read access"
ON public.deployed_lockers
FOR SELECT
TO anon, authenticated
USING (true);

-- Revoke direct write access from client roles; writes go through edge functions (service_role)
REVOKE INSERT, UPDATE, DELETE ON public.deployed_lockers FROM anon, authenticated;
GRANT SELECT ON public.deployed_lockers TO anon, authenticated;
GRANT ALL ON public.deployed_lockers TO service_role;