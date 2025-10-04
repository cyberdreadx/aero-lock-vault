-- Drop the old insecure RLS policies
DROP POLICY IF EXISTS "Anyone can insert deployed lockers" ON public.deployed_lockers;
DROP POLICY IF EXISTS "Anyone can view deployed lockers" ON public.deployed_lockers;