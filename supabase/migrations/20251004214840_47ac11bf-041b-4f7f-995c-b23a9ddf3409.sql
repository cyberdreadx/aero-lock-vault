-- Create table to store deployed LP locker contracts
CREATE TABLE public.deployed_lockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  locker_address TEXT NOT NULL,
  lp_token_address TEXT NOT NULL,
  fee_receiver_address TEXT NOT NULL,
  deployment_tx_hash TEXT,
  deployed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(locker_address)
);

-- Enable RLS
ALTER TABLE public.deployed_lockers ENABLE ROW LEVEL SECURITY;

-- Users can view their own deployed lockers
CREATE POLICY "Users can view own lockers"
ON public.deployed_lockers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own lockers
CREATE POLICY "Users can insert own lockers"
ON public.deployed_lockers
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_deployed_lockers_user_id ON public.deployed_lockers(user_id);
CREATE INDEX idx_deployed_lockers_address ON public.deployed_lockers(locker_address);