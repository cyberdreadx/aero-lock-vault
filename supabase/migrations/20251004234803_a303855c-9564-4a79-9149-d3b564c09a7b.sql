-- Add RLS policies to deployed_lockers table

-- Policy: Users can only view their own deployed lockers
CREATE POLICY "Users can view their own lockers"
ON public.deployed_lockers
FOR SELECT
USING (auth.uid()::text = wallet_address OR auth.uid() IS NULL);

-- Policy: Only authenticated users can insert their own locker records
CREATE POLICY "Users can insert their own lockers"
ON public.deployed_lockers
FOR INSERT
WITH CHECK (auth.uid()::text = wallet_address);

-- Add a wallet_address column validation to ensure it's a valid Ethereum address
ALTER TABLE public.deployed_lockers
ADD CONSTRAINT valid_ethereum_address 
CHECK (locker_address ~* '^0x[a-f0-9]{40}$' AND lp_token_address ~* '^0x[a-f0-9]{40}$');

-- Add created_by column to track who created the record
ALTER TABLE public.deployed_lockers
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Update existing records to have created_by set (if any exist)
UPDATE public.deployed_lockers
SET created_by = auth.uid()
WHERE created_by IS NULL;