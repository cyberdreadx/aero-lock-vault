-- Affiliate program: one row per paid locker sale that came through a referral link.
-- Written only by edge functions (service role); publicly readable so affiliates can
-- see their stats without signing in. Wei amounts are stored as digit strings because
-- they exceed JavaScript's safe integer range.
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer text NOT NULL CHECK (referrer ~ '^0x[0-9a-f]{40}$'),
  buyer text NOT NULL CHECK (buyer ~ '^0x[0-9a-f]{40}$'),
  locker_address text NOT NULL UNIQUE,
  payment_tx_hash text NOT NULL UNIQUE,
  sale_wei text NOT NULL CHECK (sale_wei ~ '^[0-9]+$'),
  commission_wei text NOT NULL CHECK (commission_wei ~ '^[0-9]+$'),
  paid_tx_hash text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (referrer <> buyer)
);

CREATE INDEX IF NOT EXISTS affiliate_referrals_referrer_idx ON public.affiliate_referrals (referrer);
CREATE INDEX IF NOT EXISTS affiliate_referrals_unpaid_idx ON public.affiliate_referrals (referrer) WHERE paid_tx_hash IS NULL;

ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.affiliate_referrals;
CREATE POLICY "Public read access" ON public.affiliate_referrals FOR SELECT USING (true);

GRANT SELECT ON public.affiliate_referrals TO anon, authenticated;
GRANT ALL ON public.affiliate_referrals TO service_role;
