-- Which product a referred sale was: a 30-day-notice locker, a timed/vesting lock, or a
-- team vesting batch. Existing rows are all lockers.
ALTER TABLE public.affiliate_referrals
  ADD COLUMN IF NOT EXISTS product text NOT NULL DEFAULT 'locker'
  CHECK (product IN ('locker', 'timelock', 'team'));