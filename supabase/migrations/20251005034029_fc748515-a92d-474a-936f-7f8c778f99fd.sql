-- Add current_owner column to track ownership transfers
ALTER TABLE deployed_lockers 
ADD COLUMN IF NOT EXISTS current_owner text;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_deployed_lockers_current_owner 
ON deployed_lockers(current_owner);

-- Update RLS policy to allow users to view lockers they own (either as deployer or current owner)
DROP POLICY IF EXISTS "Users can view their own lockers" ON deployed_lockers;

CREATE POLICY "Users can view their own or owned lockers"
ON deployed_lockers
FOR SELECT
USING (
  wallet_address = lower(COALESCE((auth.jwt()->>'wallet_address'), ''))
  OR current_owner = lower(COALESCE((auth.jwt()->>'wallet_address'), ''))
);

-- Allow anyone to update current_owner (verified by edge function)
DROP POLICY IF EXISTS "Anyone can update locker ownership" ON deployed_lockers;

CREATE POLICY "Anyone can update locker ownership"
ON deployed_lockers
FOR UPDATE
USING (true)
WITH CHECK (true);