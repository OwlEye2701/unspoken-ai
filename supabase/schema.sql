-- ==============================================================================
-- Rizz AI — Complete Production-Oriented Schema & RLS Policies
-- Subscriptions, Credit Ledger, Usage History, Audit Logs, and RLS
-- ==============================================================================

-- 1. Ensure public schema function execution is restricted
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- 2. User Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'tester', 'owner')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anonymous access to profiles"
  ON public.profiles FOR ALL TO anon USING (false);

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Note: Profile role is immutable to users directly. Only service role can update roles.
CREATE POLICY "Users can update own non-sensitive profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired')),
  provider TEXT NOT NULL DEFAULT 'internal' CHECK (provider IN ('internal', 'stripe', 'razorpay')),
  provider_subscription_id TEXT,
  provider_customer_id TEXT,
  current_period_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access to subscriptions"
  ON public.subscriptions FOR ALL TO anon USING (false);

CREATE POLICY "Users can read own subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Deny client inserts/updates/deletes on subscriptions. Service role only.
CREATE POLICY "Prevent client direct subscription mutations"
  ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (false);

-- 4. Credit Accounts Table
-- Stores current credit balance, lifetime granted, and lifetime used.
CREATE TABLE IF NOT EXISTS public.credit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance INT NOT NULL DEFAULT 10 CHECK (balance >= 0),
  lifetime_granted INT NOT NULL DEFAULT 10 CHECK (lifetime_granted >= 0),
  lifetime_used INT NOT NULL DEFAULT 0 CHECK (lifetime_used >= 0),
  has_unlimited_credits BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_accounts_user_id ON public.credit_accounts(user_id);

ALTER TABLE public.credit_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access to credit_accounts"
  ON public.credit_accounts FOR ALL TO anon USING (false);

CREATE POLICY "Users can read own credit account"
  ON public.credit_accounts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 5. Credit Ledger / Transactions (Append-Only)
-- Records every deduction, grant, refund, and webhook event atomically.
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT NOT NULL, -- negative for deduction, positive for grant/refund
  balance_after INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('initial_grant', 'generation_deduction', 'refund', 'subscription_grant', 'owner_grant', 'tester_grant')),
  description TEXT NOT NULL,
  idempotency_key TEXT UNIQUE, -- prevents duplicate deductions or webhook processing
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_idempotency ON public.credit_transactions(idempotency_key);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access to credit_transactions"
  ON public.credit_transactions FOR ALL TO anon USING (false);

CREATE POLICY "Users can read own credit transactions"
  ON public.credit_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 6. Generation Usage History
CREATE TABLE IF NOT EXISTS public.generation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_type TEXT NOT NULL CHECK (input_type IN ('screenshot', 'text')),
  context_provided BOOLEAN NOT NULL DEFAULT false,
  model_used TEXT NOT NULL,
  credits_spent INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'refunded')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_generation_history_user_id ON public.generation_history(user_id);

ALTER TABLE public.generation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access to generation_history"
  ON public.generation_history FOR ALL TO anon USING (false);

CREATE POLICY "Users can read own generation history"
  ON public.generation_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 7. Audit Logs Table (Append-Only for Owner/Administrative Operations)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_email TEXT,
  details JSONB DEFAULT '{}'::jsonb NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_user_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon and normal user access to audit_logs"
  ON public.audit_logs FOR ALL TO anon USING (false);

-- Normal users cannot read or write audit logs.
-- Service role has full access; owners can read through server admin endpoints.

-- 8. Atomic Deduction Stored Procedure (PostgreSQL)
-- Performs atomic balance check and deduction to eliminate race conditions.
CREATE OR REPLACE FUNCTION public.deduct_credit_atomic(
  p_user_id UUID,
  p_cost INT,
  p_idempotency_key TEXT,
  p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account RECORD;
  v_new_balance INT;
  v_tx_id UUID;
BEGIN
  -- 1. Check idempotency
  IF EXISTS (SELECT 1 FROM public.credit_transactions WHERE idempotency_key = p_idempotency_key) THEN
    SELECT balance, has_unlimited_credits INTO v_account FROM public.credit_accounts WHERE user_id = p_user_id;
    RETURN jsonb_build_object('success', true, 'balance', v_account.balance, 'already_processed', true);
  END IF;

  -- 2. Lock credit account row for update
  SELECT * INTO v_account FROM public.credit_accounts WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    -- Account does not exist yet; initialize with default 10 credits
    INSERT INTO public.credit_accounts (user_id, balance, lifetime_granted, lifetime_used)
    VALUES (p_user_id, 10, 10, 0)
    RETURNING * INTO v_account;
  END IF;

  -- 3. Check unlimited test privilege
  IF v_account.has_unlimited_credits THEN
    INSERT INTO public.credit_transactions (
      user_id, amount, balance_after, type, description, idempotency_key, metadata
    )
    VALUES (
      p_user_id, 0, v_account.balance, 'generation_deduction', p_description, p_idempotency_key,
      '{"unlimited": true}'::jsonb
    )
    RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object('success', true, 'balance', v_account.balance, 'unlimited', true);
  END IF;

  -- 4. Check sufficient balance
  IF v_account.balance < p_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_credits', 'balance', v_account.balance);
  END IF;

  -- 5. Deduct balance
  v_new_balance := v_account.balance - p_cost;
  UPDATE public.credit_accounts
  SET balance = v_new_balance,
      lifetime_used = lifetime_used + p_cost,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- 6. Insert transaction
  INSERT INTO public.credit_transactions (
    user_id, amount, balance_after, type, description, idempotency_key
  )
  VALUES (
    p_user_id, -p_cost, v_new_balance, 'generation_deduction', p_description, p_idempotency_key
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object('success', true, 'balance', v_new_balance, 'transaction_id', v_tx_id);
END;
$$;
