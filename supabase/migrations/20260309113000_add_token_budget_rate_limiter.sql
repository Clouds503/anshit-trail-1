-- Token budget limiter for AI/image generation workloads.
CREATE TABLE IF NOT EXISTS public.function_token_budgets (
  budget_key TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0 CHECK (token_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.function_token_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage function token budgets" ON public.function_token_budgets;
CREATE POLICY "Service role can manage function token budgets"
ON public.function_token_budgets
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.enforce_token_budget(
  p_key TEXT,
  p_limit INTEGER,
  p_cost INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_row public.function_token_budgets%ROWTYPE;
  v_cost INTEGER := GREATEST(COALESCE(p_cost, 0), 0);
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
    RETURN false;
  END IF;

  IF p_limit <= 0 OR p_window_seconds <= 0 THEN
    RETURN false;
  END IF;

  IF v_cost = 0 THEN
    RETURN true;
  END IF;

  LOOP
    SELECT *
    INTO v_row
    FROM public.function_token_budgets
    WHERE budget_key = p_key
    FOR UPDATE;

    IF NOT FOUND THEN
      BEGIN
        IF v_cost > p_limit THEN
          RETURN false;
        END IF;
        INSERT INTO public.function_token_budgets (budget_key, window_started_at, token_count, updated_at)
        VALUES (p_key, v_now, v_cost, v_now);
        RETURN true;
      EXCEPTION WHEN unique_violation THEN
        -- Retry on concurrent insert.
      END;
    ELSE
      IF v_row.window_started_at <= (v_now - make_interval(secs => p_window_seconds)) THEN
        IF v_cost > p_limit THEN
          UPDATE public.function_token_budgets
          SET window_started_at = v_now,
              token_count = 0,
              updated_at = v_now
          WHERE budget_key = p_key;
          RETURN false;
        END IF;
        UPDATE public.function_token_budgets
        SET window_started_at = v_now,
            token_count = v_cost,
            updated_at = v_now
        WHERE budget_key = p_key;
        RETURN true;
      ELSIF (v_row.token_count + v_cost) <= p_limit THEN
        UPDATE public.function_token_budgets
        SET token_count = v_row.token_count + v_cost,
            updated_at = v_now
        WHERE budget_key = p_key;
        RETURN true;
      ELSE
        UPDATE public.function_token_budgets
        SET updated_at = v_now
        WHERE budget_key = p_key;
        RETURN false;
      END IF;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_token_budget(TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_token_budget(TEXT, INTEGER, INTEGER, INTEGER) TO service_role;
