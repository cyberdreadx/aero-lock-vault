-- Update RLS policies for Web3 app without Supabase auth
DROP POLICY IF EXISTS "Users can view their own or owned lockers" ON deployed_lockers;
DROP POLICY IF EXISTS "Public can view all deployed lockers" ON deployed_lockers;

-- Allow public read access (locker addresses are public blockchain data)
CREATE POLICY "Anyone can view deployed lockers"
ON deployed_lockers
FOR SELECT
USING (true);