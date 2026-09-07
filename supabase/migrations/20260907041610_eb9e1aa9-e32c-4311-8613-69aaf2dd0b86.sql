DROP POLICY IF EXISTS "Anyone can update locker ownership" ON public.deployed_lockers;
DROP POLICY IF EXISTS "Users can insert their own lockers" ON public.deployed_lockers;
DROP POLICY IF EXISTS "Anyone can view deployed lockers" ON public.deployed_lockers;