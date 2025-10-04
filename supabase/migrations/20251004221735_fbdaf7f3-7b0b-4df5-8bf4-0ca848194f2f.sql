-- Drop old RLS policies first
DROP POLICY IF EXISTS "Users can view own lockers" ON public.deployed_lockers;
DROP POLICY IF EXISTS "Users can insert own lockers" ON public.deployed_lockers;

-- Now we can drop the user_id column
ALTER TABLE public.deployed_lockers DROP COLUMN user_id;

-- Add wallet_address column
ALTER TABLE public.deployed_lockers ADD COLUMN wallet_address TEXT NOT NULL DEFAULT '';

-- Create new RLS policies based on wallet address
CREATE POLICY "Anyone can view deployed lockers"
ON public.deployed_lockers
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert deployed lockers"
ON public.deployed_lockers
FOR INSERT
WITH CHECK (true);