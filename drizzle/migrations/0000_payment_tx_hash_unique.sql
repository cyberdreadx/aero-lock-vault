-- Each deployment fee payment can pay for exactly one locker.
-- Stored lowercase by verify-deployment; older rows (before this check) stay NULL.
ALTER TABLE public.deployed_lockers
  ADD COLUMN IF NOT EXISTS payment_tx_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS deployed_lockers_payment_tx_hash_key
  ON public.deployed_lockers (payment_tx_hash)
  WHERE payment_tx_hash IS NOT NULL;