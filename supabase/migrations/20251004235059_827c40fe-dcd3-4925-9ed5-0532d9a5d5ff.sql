-- Make the table publicly readable for the home page stats
-- but keep INSERT restricted to service role only (via edge function)

-- Create a new policy that allows public SELECT
CREATE POLICY "Public can view all deployed lockers"
ON public.deployed_lockers
FOR SELECT
USING (true);

-- Remove the created_by column as we don't have auth yet
ALTER TABLE public.deployed_lockers
DROP COLUMN IF EXISTS created_by;